import type { ProjectResponseDto } from "@st-manager/contracts";

import { projectsApi } from "@/lib/api-client";
import { notifyProjectsUpdated } from "@/lib/inquiry/events";
import {
  getActiveStudioId,
  isBrowserOnline,
  isRetryableSyncFailure,
  readStudioScopedItem,
  withTimeout,
  writeStudioScopedItem,
} from "@/lib/sync";

import { dtoToStudioProject, studioProjectToResponseDto } from "./map-dto";
import { runLegacyProjectBackfill } from "./backfill";
import { cascadeProjectIdRemap } from "./cascade-ids";
import {
  buildOptimisticProject,
  createLocalProjectId,
  enqueuePendingProjectCreate,
  isLocalProjectId,
  listPendingProjectCreates,
  removePendingProjectCreate,
  updatePendingProjectCreate,
  type PendingProjectCreatePayload,
} from "./offline-queue";
import type { StudioProject } from "./types";
import { PROJECTS_STORAGE_KEY } from "./types";

const EPOCH_ISO = "1970-01-01T00:00:00.000Z";
const REFRESH_TIMEOUT_MS = 8_000;
const CREATE_TIMEOUT_MS = 8_000;

const PROJECTS_CACHE_KEY = "st-manager-projects-cache";
const PROJECTS_CURSOR_KEY = "st-manager-projects-sync-cursor";
const PROJECTS_TOMBSTONES_KEY = "st-manager-projects-tombstones";

let projectsSnapshot: StudioProject[] = [];
let refreshPromise: Promise<StudioProject[]> | null = null;
let reconcilePromise: Promise<StudioProject[]> | null = null;
let flushPromise: Promise<void> | null = null;

/** In-flight online creates keyed by payload fingerprint — prevents double POST. */
const inFlightCreates = new Map<string, Promise<ProjectResponseDto>>();

type ProjectTombstones = Record<string, string>;

function normalizeInquiryId(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function createPayloadFingerprint(payload: PendingProjectCreatePayload): string {
  const inquiryId = normalizeInquiryId(payload.inquiryId);
  if (inquiryId) {
    return `inquiry:${inquiryId}`;
  }
  return [
    payload.projectName.trim().toLowerCase(),
    payload.clientName.trim().toLowerCase(),
  ].join("|");
}

function findDuplicateInSnapshot(
  payload: PendingProjectCreatePayload,
  excludeLocalId?: string,
): StudioProject | undefined {
  const inquiryId = normalizeInquiryId(payload.inquiryId);
  const projectName = payload.projectName.trim().toLowerCase();
  const clientName = payload.clientName.trim().toLowerCase();

  return projectsSnapshot.find((project) => {
    if (isLocalProjectId(project.id) || project.id === excludeLocalId) {
      return false;
    }
    if (inquiryId && normalizeInquiryId(project.inquiryId) === inquiryId) {
      return true;
    }
    if (
      !inquiryId &&
      project.projectName.trim().toLowerCase() === projectName &&
      project.clientName.trim().toLowerCase() === clientName
    ) {
      return true;
    }
    return false;
  });
}

export function getProjectsSnapshot(): StudioProject[] {
  return projectsSnapshot;
}

export function getProjectFromSnapshot(projectId: string): StudioProject | undefined {
  return projectsSnapshot.find((project) => project.id === projectId);
}

export function setProjectsSnapshot(next: StudioProject[]): StudioProject[] {
  projectsSnapshot = next;
  return projectsSnapshot;
}

function sortProjects(projects: StudioProject[]): StudioProject[] {
  return [...projects].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function readTombstones(studioId: string | null = getActiveStudioId()): ProjectTombstones {
  if (!studioId) return {};
  try {
    const raw = readStudioScopedItem(PROJECTS_TOMBSTONES_KEY, studioId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProjectTombstones;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTombstones(
  tombstones: ProjectTombstones,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(PROJECTS_TOMBSTONES_KEY, JSON.stringify(tombstones), studioId);
}

function latestTimestamp(values: Array<string | null | undefined>): string {
  let max = 0;
  let iso = EPOCH_ISO;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isNaN(ms) && ms >= max) {
      max = ms;
      iso = value;
    }
  }
  return iso;
}

function readCachedProjects(studioId: string | null = getActiveStudioId()): StudioProject[] {
  if (!studioId) return [];
  try {
    const raw = readStudioScopedItem(PROJECTS_CACHE_KEY, studioId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudioProject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedProjects(
  projects: StudioProject[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(PROJECTS_CACHE_KEY, JSON.stringify(projects), studioId);
}

export function readProjectsSyncCursor(studioId: string | null = getActiveStudioId()): string | null {
  if (!studioId) return null;
  return readStudioScopedItem(PROJECTS_CURSOR_KEY, studioId);
}

export function writeProjectsSyncCursor(
  cursor: string,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(PROJECTS_CURSOR_KEY, cursor, studioId);
}

function migrateLegacyProjectsToStudioCache(): void {
  const studioId = getActiveStudioId();
  if (!studioId || typeof window === "undefined") {
    return;
  }
  if (readStudioScopedItem(PROJECTS_CACHE_KEY, studioId)) {
    return;
  }
  try {
    const legacy = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!legacy) {
      return;
    }
    const parsed = JSON.parse(legacy);
    if (Array.isArray(parsed)) {
      writeStudioScopedItem(PROJECTS_CACHE_KEY, legacy, studioId);
    }
  } catch {
    // ignore corrupt legacy cache
  }
}

export function hydrateProjectsSnapshotFromCache(): StudioProject[] {
  migrateLegacyProjectsToStudioCache();

  const tombstones = readTombstones();
  const cached = readCachedProjects().filter((project) => !tombstones[project.id]);
  const pending = listPendingProjectCreates().map((entry) =>
    buildOptimisticProject(entry.localId, entry.studioId, entry.payload),
  );
  const byId = new Map<string, StudioProject>();
  for (const project of [...cached, ...pending]) {
    if (tombstones[project.id] && !isLocalProjectId(project.id)) {
      continue;
    }
    byId.set(project.id, project);
  }
  setProjectsSnapshot(sortProjects([...byId.values()]));
  notifyProjectsUpdated();
  return projectsSnapshot;
}

export async function loadProductionProjects(): Promise<ProjectResponseDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: ProjectResponseDto[] = [];

  while (page <= 20) {
    const response = await projectsApi.listProjects({ page, pageSize });
    all.push(...response.data);
    if (response.data.length < pageSize) {
      break;
    }
    page += 1;
  }

  return all.filter((project) => !project.deletedAt);
}

export function applyProjectChangeRecords(records: ProjectResponseDto[]): StudioProject[] {
  const byId = new Map(projectsSnapshot.map((project) => [project.id, project]));
  const tombstones = readTombstones();

  for (const remote of records) {
    if (remote.deletedAt) {
      const deletedMs = Date.parse(remote.deletedAt);
      const existingTomb = tombstones[remote.id];
      const existingMs = existingTomb ? Date.parse(existingTomb) : 0;
      if (Number.isNaN(deletedMs) || deletedMs >= existingMs) {
        tombstones[remote.id] = remote.deletedAt;
      }
      byId.delete(remote.id);
      continue;
    }

    const tomb = tombstones[remote.id];
    if (tomb) {
      const tombMs = Date.parse(tomb);
      const remoteMs = Date.parse(remote.updatedAt);
      if (!Number.isNaN(tombMs) && (Number.isNaN(remoteMs) || remoteMs <= tombMs)) {
        continue;
      }
      delete tombstones[remote.id];
    }

    const local = byId.get(remote.id);
    const remoteProject = dtoToStudioProject(remote);
    if (!local) {
      byId.set(remote.id, remoteProject);
      continue;
    }

    const localMs = Date.parse(local.updatedAt);
    const remoteMs = Date.parse(remote.updatedAt);
    if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
      byId.set(remote.id, remoteProject);
    }
  }

  writeTombstones(tombstones);
  const next = sortProjects(
    [...byId.values()].filter((project) => isLocalProjectId(project.id) || !tombstones[project.id]),
  );
  setProjectsSnapshot(next);
  writeCachedProjects(next);
  return next;
}

/**
 * Any server-backed snapshot row missing from the authoritative active list is
 * treated as deleted. This applies remote deletes even when /projects/changes
 * was skipped by a too-new cursor.
 */
export function applyAuthoritativeActiveList(
  remoteActive: ProjectResponseDto[],
  candidateIdsToTombstone?: ReadonlySet<string>,
): StudioProject[] {
  const tombstones = readTombstones();
  const remoteIds = new Set(remoteActive.map((project) => project.id));
  const now = new Date().toISOString();
  const byId = new Map(projectsSnapshot.map((project) => [project.id, project]));
  const mayTombstone = (id: string) =>
    !candidateIdsToTombstone || candidateIdsToTombstone.has(id);

  for (const project of [...byId.values()]) {
    if (isLocalProjectId(project.id)) {
      continue;
    }
    if (!remoteIds.has(project.id) && mayTombstone(project.id)) {
      tombstones[project.id] = tombstones[project.id] ?? now;
      byId.delete(project.id);
    }
  }

  for (const remote of remoteActive) {
    if (remote.deletedAt) {
      continue;
    }
    delete tombstones[remote.id];
    const remoteProject = dtoToStudioProject(remote);
    const local = byId.get(remote.id);
    if (!local) {
      byId.set(remote.id, remoteProject);
      continue;
    }
    const localMs = Date.parse(local.updatedAt);
    const remoteMs = Date.parse(remote.updatedAt);
    if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
      byId.set(remote.id, remoteProject);
    }
  }

  writeTombstones(tombstones);
  const next = sortProjects(
    [...byId.values()].filter(
      (project) => isLocalProjectId(project.id) || !tombstones[project.id],
    ),
  );
  setProjectsSnapshot(next);
  writeCachedProjects(next);
  return next;
}

function serverIdsInSnapshot(): Set<string> {
  return new Set(
    projectsSnapshot.filter((project) => !isLocalProjectId(project.id)).map((project) => project.id),
  );
}

export async function refreshProjectsSnapshot(): Promise<StudioProject[]> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const knownIdsBeforeFetch = serverIdsInSnapshot();

  refreshPromise = withTimeout(loadProductionProjects(), REFRESH_TIMEOUT_MS)
    .then((projects) => {
      const pendingLocals = projectsSnapshot.filter((project) => isLocalProjectId(project.id));
      const byId = new Map(projects.map((project) => [project.id, dtoToStudioProject(project)]));
      for (const local of pendingLocals) {
        byId.set(local.id, local);
      }
      for (const current of projectsSnapshot) {
        if (
          !isLocalProjectId(current.id) &&
          !knownIdsBeforeFetch.has(current.id) &&
          !byId.has(current.id)
        ) {
          byId.set(current.id, current);
        }
      }

      const tombstones = readTombstones();
      const now = new Date().toISOString();
      const remoteIds = new Set(projects.map((project) => project.id));
      for (const priorId of knownIdsBeforeFetch) {
        if (!remoteIds.has(priorId)) {
          tombstones[priorId] = tombstones[priorId] ?? now;
        }
      }
      for (const project of projects) {
        delete tombstones[project.id];
      }
      writeTombstones(tombstones);

      const next = sortProjects(
        [...byId.values()].filter(
          (project) => isLocalProjectId(project.id) || !tombstones[project.id],
        ),
      );
      setProjectsSnapshot(next);
      writeCachedProjects(next);
      writeProjectsSyncCursor(latestTimestamp(projects.map((project) => project.updatedAt)));
      return next;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function reconcileProjectsFromApi(): Promise<StudioProject[]> {
  if (reconcilePromise) {
    return reconcilePromise;
  }

  reconcilePromise = (async () => {
    const studioId = getActiveStudioId();
    if (!studioId) {
      return projectsSnapshot;
    }

    if (!isBrowserOnline()) {
      hydrateProjectsSnapshotFromCache();
      return projectsSnapshot;
    }

    if (projectsSnapshot.length === 0) {
      hydrateProjectsSnapshotFromCache();
    }

    const cursor = readProjectsSyncCursor(studioId);
    if (!cursor) {
      const full = await refreshProjectsSnapshot();
      await flushPendingProjectCreates();
      await runLegacyProjectBackfill();
      notifyProjectsUpdated();
      return full;
    }

    let since = cursor;
    let hasMore = true;
    while (hasMore) {
      const page = await withTimeout(projectsApi.pullProjectChanges({ since }), REFRESH_TIMEOUT_MS);
      if (page.records.length > 0) {
        applyProjectChangeRecords(page.records);
      }
      const parsedServer = Date.parse(page.serverTime);
      const parsedSince = Date.parse(since);
      const nextCursor =
        !Number.isNaN(parsedServer) && (Number.isNaN(parsedSince) || parsedServer >= parsedSince)
          ? page.serverTime
          : since;
      writeProjectsSyncCursor(nextCursor, studioId);
      since = nextCursor;
      hasMore = page.hasMore;
    }

    const knownIdsBeforeList = serverIdsInSnapshot();
    applyAuthoritativeActiveList(
      await withTimeout(loadProductionProjects(), REFRESH_TIMEOUT_MS),
      knownIdsBeforeList,
    );

    await flushPendingProjectCreates();
    await runLegacyProjectBackfill();
    notifyProjectsUpdated();
    return projectsSnapshot;
  })().finally(() => {
    reconcilePromise = null;
  });

  return reconcilePromise;
}

export function upsertProjectInSnapshot(project: StudioProject): void {
  const tomb = readTombstones()[project.id];
  if (tomb && !isLocalProjectId(project.id)) {
    const tombMs = Date.parse(tomb);
    const projectMs = Date.parse(project.updatedAt);
    if (!Number.isNaN(tombMs) && (Number.isNaN(projectMs) || projectMs <= tombMs)) {
      return;
    }
    const tombstones = readTombstones();
    delete tombstones[project.id];
    writeTombstones(tombstones);
  }

  const next = sortProjects([
    project,
    ...projectsSnapshot.filter((entry) => entry.id !== project.id),
  ]);
  setProjectsSnapshot(next);
  writeCachedProjects(next);
}

export function removeProjectFromSnapshot(projectId: string): void {
  const next = projectsSnapshot.filter((project) => project.id !== projectId);
  setProjectsSnapshot(next);
  writeCachedProjects(next);
  const tombstones = readTombstones();
  tombstones[projectId] = new Date().toISOString();
  writeTombstones(tombstones);
}

/** Remap offline local project id → server id in snapshot and dependent stores. */
export function remapLocalProjectId(localId: string, serverProject: ProjectResponseDto): void {
  cascadeProjectIdRemap(localId, serverProject.id);
  const serverStudioProject = dtoToStudioProject(serverProject);
  const withoutLocal = projectsSnapshot.filter(
    (project) => project.id !== localId && project.id !== serverProject.id,
  );
  setProjectsSnapshot(sortProjects([serverStudioProject, ...withoutLocal]));
  writeCachedProjects(projectsSnapshot);
  removePendingProjectCreate(localId);
  notifyProjectsUpdated();
}

export function createProjectOptimistic(payload: PendingProjectCreatePayload): StudioProject {
  const studioId = getActiveStudioId();
  if (!studioId) {
    throw new Error("Studio context required");
  }
  return enqueueOptimisticCreate(studioId, payload);
}

function enqueueOptimisticCreate(
  studioId: string,
  payload: PendingProjectCreatePayload,
): StudioProject {
  const duplicate = findDuplicateInSnapshot(payload);
  if (duplicate) {
    return duplicate;
  }

  const localId = createLocalProjectId();
  const optimistic = buildOptimisticProject(localId, studioId, payload);
  enqueuePendingProjectCreate({
    localId,
    studioId,
    payload,
    enqueuedAt: new Date().toISOString(),
  });
  upsertProjectInSnapshot(optimistic);
  notifyProjectsUpdated();
  return optimistic;
}

/**
 * Offline-safe create: appear immediately with a local id, enqueue for API flush.
 * Online success still creates via API exactly once. Retryable network failures
 * stay queued instead of hanging the UI or dropping the record.
 */
export async function createProjectOfflineAware(
  payload: PendingProjectCreatePayload,
): Promise<StudioProject> {
  const studioId = getActiveStudioId();
  if (!studioId) {
    throw new Error("Studio context required");
  }

  const existing = findDuplicateInSnapshot(payload);
  if (existing) {
    return existing;
  }

  if (!isBrowserOnline()) {
    return enqueueOptimisticCreate(studioId, payload);
  }

  const fingerprint = createPayloadFingerprint(payload);
  const inflight = inFlightCreates.get(fingerprint);
  if (inflight) {
    const created = await inflight;
    return dtoToStudioProject(created);
  }

  const request = projectsApi.createProject(payload);
  void request.catch(() => undefined);
  inFlightCreates.set(fingerprint, request);

  const createPromise = (async () => {
    try {
      const created = await withTimeout(request, CREATE_TIMEOUT_MS);
      const project = dtoToStudioProject(created);
      upsertProjectInSnapshot(project);
      notifyProjectsUpdated();
      return project;
    } catch (error) {
      if (!isRetryableSyncFailure(error)) {
        throw error;
      }
      const optimistic = enqueueOptimisticCreate(studioId, payload);
      void request
        .then((created) => {
          updatePendingProjectCreate(optimistic.id, { serverId: created.id }, studioId);
          remapLocalProjectId(optimistic.id, created);
        })
        .catch(() => {
          // Leave queued for flush if the original POST never landed.
        });
      return optimistic;
    }
  })();

  void request.finally(() => {
    inFlightCreates.delete(fingerprint);
  });

  return createPromise;
}

/** Flush pending offline creates exactly once each (idempotent via serverId + dedupe). */
export async function flushPendingProjectCreates(): Promise<void> {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    const studioId = getActiveStudioId();
    if (!studioId) {
      return;
    }

    const pending = listPendingProjectCreates(studioId);
    for (const entry of pending) {
      try {
        const fingerprint = createPayloadFingerprint(entry.payload);
        const inflight = inFlightCreates.get(fingerprint);
        if (inflight) {
          try {
            const created = await inflight;
            updatePendingProjectCreate(entry.localId, { serverId: created.id }, studioId);
            remapLocalProjectId(entry.localId, created);
          } catch {
            // Original POST still failing — keep queued.
          }
          continue;
        }

        if (entry.serverId) {
          const existing = projectsSnapshot.find((project) => project.id === entry.serverId);
          if (existing) {
            remapLocalProjectId(
              entry.localId,
              studioProjectToResponseDto(existing, studioId),
            );
            continue;
          }
          try {
            const fetched = await projectsApi.getProject(entry.serverId);
            remapLocalProjectId(entry.localId, fetched);
            continue;
          } catch {
            // Fall through and recreate if the remembered server id is gone.
          }
        }

        const duplicate = findDuplicateInSnapshot(entry.payload, entry.localId);
        if (duplicate) {
          updatePendingProjectCreate(entry.localId, { serverId: duplicate.id }, studioId);
          remapLocalProjectId(
            entry.localId,
            studioProjectToResponseDto(duplicate, studioId),
          );
          continue;
        }

        const created = await withTimeout(
          projectsApi.createProject(entry.payload),
          CREATE_TIMEOUT_MS,
        );
        updatePendingProjectCreate(entry.localId, { serverId: created.id }, studioId);
        remapLocalProjectId(entry.localId, created);
      } catch {
        // Leave in queue for the next online/focus reconcile.
      }
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}
