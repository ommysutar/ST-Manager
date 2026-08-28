import type { InquiryResponseDto } from "@st-manager/contracts";

import { inquiriesApi } from "@/lib/api-client";
import { isLocalProjectId, listPendingProjectCreates } from "@/lib/projects/offline-queue";
import {
  getActiveStudioId,
  isBrowserOnline,
  isRetryableSyncFailure,
  readStudioScopedItem,
  withTimeout,
  writeStudioScopedItem,
} from "@/lib/sync";

import { migrateLegacyInquiriesToStudioCache, runLegacyInquiryBackfill } from "./backfill";
import { cascadeInquiryIdRemap } from "./cascade-ids";
import { notifyInquiriesUpdated } from "./events";
import {
  dtoToSavedInquiry,
  savedInquiryPatchToUpdateDto,
  savedInquiryToResponseDto,
} from "./map-dto";
import {
  buildOptimisticInquiry,
  createLocalInquiryId,
  enqueuePendingInquiryCreate,
  isLocalInquiryId,
  listPendingInquiryCreates,
  removePendingInquiryCreate,
  updatePendingInquiryCreate,
  type PendingInquiryCreatePayload,
} from "./offline-queue";
import { setInquiriesSnapshot } from "./snapshots";
import type { InquiryWizardFormValues, SavedInquiry } from "./types";
import { INQUIRIES_STORAGE_KEY } from "./types";

const EPOCH_ISO = "1970-01-01T00:00:00.000Z";
const REFRESH_TIMEOUT_MS = 8_000;
const CREATE_TIMEOUT_MS = 8_000;

const INQUIRIES_CACHE_KEY = "st-manager-inquiries-cache";
const INQUIRIES_CURSOR_KEY = "st-manager-inquiries-sync-cursor";
const INQUIRIES_TOMBSTONES_KEY = "st-manager-inquiries-tombstones";
const PROJECTS_CACHE_KEY = "st-manager-projects-cache";

let inquiriesSnapshot: SavedInquiry[] = [];
let refreshPromise: Promise<SavedInquiry[]> | null = null;
let reconcilePromise: Promise<SavedInquiry[]> | null = null;
let flushPromise: Promise<void> | null = null;

const inFlightCreates = new Map<string, Promise<InquiryResponseDto>>();

type InquiryTombstones = Record<string, string>;

function createPayloadFingerprint(payload: PendingInquiryCreatePayload): string {
  const form = payload.form as InquiryWizardFormValues;
  return [
    form.projectName?.trim().toLowerCase() ?? "",
    form.clientName?.trim().toLowerCase() ?? "",
    form.mobileNumber?.trim() ?? "",
  ].join("|");
}

function findDuplicateInSnapshot(
  payload: PendingInquiryCreatePayload,
  excludeLocalId?: string,
): SavedInquiry | undefined {
  const projectName = (payload.form as InquiryWizardFormValues).projectName?.trim().toLowerCase() ?? "";
  const clientName = (payload.form as InquiryWizardFormValues).clientName?.trim().toLowerCase() ?? "";
  const mobile = (payload.form as InquiryWizardFormValues).mobileNumber?.trim() ?? "";

  return inquiriesSnapshot.find((inquiry) => {
    if (isLocalInquiryId(inquiry.id) || inquiry.id === excludeLocalId) {
      return false;
    }
    return (
      inquiry.form.projectName.trim().toLowerCase() === projectName &&
      inquiry.form.clientName.trim().toLowerCase() === clientName &&
      inquiry.form.mobileNumber.trim() === mobile
    );
  });
}

function getProjectFromCache(projectId: string): { id: string } | undefined {
  const studioId = getActiveStudioId();
  if (!studioId) return undefined;
  try {
    const raw = readStudioScopedItem(PROJECTS_CACHE_KEY, studioId);
    if (!raw) return undefined;
    const projects = JSON.parse(raw) as Array<{ id: string }>;
    return projects.find((project) => project.id === projectId);
  } catch {
    return undefined;
  }
}

function resolveProjectIdForFlush(projectId: string | null | undefined): string | null {
  if (!projectId) {
    return null;
  }
  if (!isLocalProjectId(projectId)) {
    return projectId;
  }

  const project = getProjectFromCache(projectId);
  if (project && !isLocalProjectId(project.id)) {
    return project.id;
  }

  const pending = listPendingProjectCreates().find((entry) => entry.localId === projectId);
  if (pending?.serverId) {
    return pending.serverId;
  }

  return null;
}

function resolvePayloadProjectId(
  payload: PendingInquiryCreatePayload,
): PendingInquiryCreatePayload | null {
  if (!payload.projectId) {
    return payload;
  }
  const resolved = resolveProjectIdForFlush(payload.projectId);
  if (!resolved) {
    return null;
  }
  if (resolved === payload.projectId) {
    return payload;
  }
  return { ...payload, projectId: resolved };
}

export function getInquiriesStoreSnapshot(): SavedInquiry[] {
  return inquiriesSnapshot;
}

export function getInquiryFromSnapshot(inquiryId: string): SavedInquiry | undefined {
  return inquiriesSnapshot.find((inquiry) => inquiry.id === inquiryId);
}

export function setInquiriesStoreSnapshot(next: SavedInquiry[]): SavedInquiry[] {
  inquiriesSnapshot = next;
  setInquiriesSnapshot(next);
  return inquiriesSnapshot;
}

function sortInquiries(inquiries: SavedInquiry[]): SavedInquiry[] {
  return [...inquiries].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function readTombstones(studioId: string | null = getActiveStudioId()): InquiryTombstones {
  if (!studioId) return {};
  try {
    const raw = readStudioScopedItem(INQUIRIES_TOMBSTONES_KEY, studioId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as InquiryTombstones;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTombstones(
  tombstones: InquiryTombstones,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(INQUIRIES_TOMBSTONES_KEY, JSON.stringify(tombstones), studioId);
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

function readCachedInquiries(studioId: string | null = getActiveStudioId()): SavedInquiry[] {
  if (!studioId) return [];
  try {
    const raw = readStudioScopedItem(INQUIRIES_CACHE_KEY, studioId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedInquiry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedInquiries(
  inquiries: SavedInquiry[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(INQUIRIES_CACHE_KEY, JSON.stringify(inquiries), studioId);
}

export function readInquiriesSyncCursor(studioId: string | null = getActiveStudioId()): string | null {
  if (!studioId) return null;
  return readStudioScopedItem(INQUIRIES_CURSOR_KEY, studioId);
}

export function writeInquiriesSyncCursor(
  cursor: string,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(INQUIRIES_CURSOR_KEY, cursor, studioId);
}

function migrateLegacyInquiriesToStudioCacheFromStorage(): void {
  migrateLegacyInquiriesToStudioCache();
}

export function hydrateInquiriesSnapshotFromCache(): SavedInquiry[] {
  migrateLegacyInquiriesToStudioCacheFromStorage();

  const tombstones = readTombstones();
  const cached = readCachedInquiries().filter((inquiry) => !tombstones[inquiry.id]);
  const pending = listPendingInquiryCreates().map((entry) =>
    buildOptimisticInquiry(entry.localId, entry.studioId, entry.payload),
  );
  const byId = new Map<string, SavedInquiry>();
  for (const inquiry of [...cached, ...pending]) {
    if (tombstones[inquiry.id] && !isLocalInquiryId(inquiry.id)) {
      continue;
    }
    byId.set(inquiry.id, inquiry);
  }
  setInquiriesStoreSnapshot(sortInquiries([...byId.values()]));
  notifyInquiriesUpdated();
  return inquiriesSnapshot;
}

export async function loadProductionInquiries(): Promise<InquiryResponseDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: InquiryResponseDto[] = [];

  while (page <= 20) {
    const response = await inquiriesApi.listInquiries({ page, pageSize });
    all.push(...response.data);
    if (response.data.length < pageSize) {
      break;
    }
    page += 1;
  }

  return all.filter((inquiry) => !inquiry.deletedAt);
}

export function applyInquiryChangeRecords(records: InquiryResponseDto[]): SavedInquiry[] {
  const byId = new Map(inquiriesSnapshot.map((inquiry) => [inquiry.id, inquiry]));
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
    const remoteInquiry = dtoToSavedInquiry(remote);
    if (!local) {
      byId.set(remote.id, remoteInquiry);
      continue;
    }

    const localMs = Date.parse(local.updatedAt);
    const remoteMs = Date.parse(remote.updatedAt);
    if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
      byId.set(remote.id, remoteInquiry);
    }
  }

  writeTombstones(tombstones);
  const next = sortInquiries(
    [...byId.values()].filter((inquiry) => isLocalInquiryId(inquiry.id) || !tombstones[inquiry.id]),
  );
  setInquiriesStoreSnapshot(next);
  writeCachedInquiries(next);
  return next;
}

export function applyAuthoritativeActiveInquiryList(
  remoteActive: InquiryResponseDto[],
  candidateIdsToTombstone?: ReadonlySet<string>,
): SavedInquiry[] {
  const tombstones = readTombstones();
  const remoteIds = new Set(remoteActive.map((inquiry) => inquiry.id));
  const now = new Date().toISOString();
  const byId = new Map(inquiriesSnapshot.map((inquiry) => [inquiry.id, inquiry]));
  const mayTombstone = (id: string) =>
    !candidateIdsToTombstone || candidateIdsToTombstone.has(id);

  for (const inquiry of [...byId.values()]) {
    if (isLocalInquiryId(inquiry.id)) {
      continue;
    }
    if (!remoteIds.has(inquiry.id) && mayTombstone(inquiry.id)) {
      tombstones[inquiry.id] = tombstones[inquiry.id] ?? now;
      byId.delete(inquiry.id);
    }
  }

  for (const remote of remoteActive) {
    if (remote.deletedAt) {
      continue;
    }
    delete tombstones[remote.id];
    const remoteInquiry = dtoToSavedInquiry(remote);
    const local = byId.get(remote.id);
    if (!local) {
      byId.set(remote.id, remoteInquiry);
      continue;
    }
    const localMs = Date.parse(local.updatedAt);
    const remoteMs = Date.parse(remote.updatedAt);
    if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
      byId.set(remote.id, remoteInquiry);
    }
  }

  writeTombstones(tombstones);
  const next = sortInquiries(
    [...byId.values()].filter((inquiry) => isLocalInquiryId(inquiry.id) || !tombstones[inquiry.id]),
  );
  setInquiriesStoreSnapshot(next);
  writeCachedInquiries(next);
  return next;
}

function serverIdsInSnapshot(): Set<string> {
  return new Set(
    inquiriesSnapshot.filter((inquiry) => !isLocalInquiryId(inquiry.id)).map((inquiry) => inquiry.id),
  );
}

export async function refreshInquiriesSnapshot(): Promise<SavedInquiry[]> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const knownIdsBeforeFetch = serverIdsInSnapshot();

  refreshPromise = withTimeout(loadProductionInquiries(), REFRESH_TIMEOUT_MS)
    .then((inquiries) => {
      const pendingLocals = inquiriesSnapshot.filter((inquiry) => isLocalInquiryId(inquiry.id));
      const byId = new Map(inquiries.map((inquiry) => [inquiry.id, dtoToSavedInquiry(inquiry)]));
      for (const local of pendingLocals) {
        byId.set(local.id, local);
      }
      for (const current of inquiriesSnapshot) {
        if (
          !isLocalInquiryId(current.id) &&
          !knownIdsBeforeFetch.has(current.id) &&
          !byId.has(current.id)
        ) {
          byId.set(current.id, current);
        }
      }

      const tombstones = readTombstones();
      const now = new Date().toISOString();
      const remoteIds = new Set(inquiries.map((inquiry) => inquiry.id));
      for (const priorId of knownIdsBeforeFetch) {
        if (!remoteIds.has(priorId)) {
          tombstones[priorId] = tombstones[priorId] ?? now;
        }
      }
      for (const inquiry of inquiries) {
        delete tombstones[inquiry.id];
      }
      writeTombstones(tombstones);

      const next = sortInquiries(
        [...byId.values()].filter(
          (inquiry) => isLocalInquiryId(inquiry.id) || !tombstones[inquiry.id],
        ),
      );
      setInquiriesStoreSnapshot(next);
      writeCachedInquiries(next);
      writeInquiriesSyncCursor(latestTimestamp(inquiries.map((inquiry) => inquiry.updatedAt)));
      return next;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function reconcileInquiriesFromApi(): Promise<SavedInquiry[]> {
  if (reconcilePromise) {
    return reconcilePromise;
  }

  reconcilePromise = (async () => {
    const studioId = getActiveStudioId();
    if (!studioId) {
      return inquiriesSnapshot;
    }

    if (!isBrowserOnline()) {
      hydrateInquiriesSnapshotFromCache();
      return inquiriesSnapshot;
    }

    if (inquiriesSnapshot.length === 0) {
      hydrateInquiriesSnapshotFromCache();
    }

    const cursor = readInquiriesSyncCursor(studioId);
    if (!cursor) {
      const full = await refreshInquiriesSnapshot();
      await flushPendingInquiryCreates();
      await runLegacyInquiryBackfill();
      notifyInquiriesUpdated();
      return full;
    }

    let since = cursor;
    let hasMore = true;
    while (hasMore) {
      const page = await withTimeout(inquiriesApi.pullInquiryChanges({ since }), REFRESH_TIMEOUT_MS);
      if (page.records.length > 0) {
        applyInquiryChangeRecords(page.records);
      }
      const parsedServer = Date.parse(page.serverTime);
      const parsedSince = Date.parse(since);
      const nextCursor =
        !Number.isNaN(parsedServer) && (Number.isNaN(parsedSince) || parsedServer >= parsedSince)
          ? page.serverTime
          : since;
      writeInquiriesSyncCursor(nextCursor, studioId);
      since = nextCursor;
      hasMore = page.hasMore;
    }

    const knownIdsBeforeList = serverIdsInSnapshot();
    applyAuthoritativeActiveInquiryList(
      await withTimeout(loadProductionInquiries(), REFRESH_TIMEOUT_MS),
      knownIdsBeforeList,
    );

    await flushPendingInquiryCreates();
    await runLegacyInquiryBackfill();
    notifyInquiriesUpdated();
    return inquiriesSnapshot;
  })().finally(() => {
    reconcilePromise = null;
  });

  return reconcilePromise;
}

export function upsertInquiryInSnapshot(inquiry: SavedInquiry): void {
  const tomb = readTombstones()[inquiry.id];
  if (tomb && !isLocalInquiryId(inquiry.id)) {
    const tombMs = Date.parse(tomb);
    const inquiryMs = Date.parse(inquiry.updatedAt);
    if (!Number.isNaN(tombMs) && (Number.isNaN(inquiryMs) || inquiryMs <= tombMs)) {
      return;
    }
    const tombstones = readTombstones();
    delete tombstones[inquiry.id];
    writeTombstones(tombstones);
  }

  const next = sortInquiries([
    inquiry,
    ...inquiriesSnapshot.filter((entry) => entry.id !== inquiry.id),
  ]);
  setInquiriesStoreSnapshot(next);
  writeCachedInquiries(next);
}

export function removeInquiryFromSnapshot(inquiryId: string): void {
  const next = inquiriesSnapshot.filter((inquiry) => inquiry.id !== inquiryId);
  setInquiriesStoreSnapshot(next);
  writeCachedInquiries(next);
  const tombstones = readTombstones();
  tombstones[inquiryId] = new Date().toISOString();
  writeTombstones(tombstones);
}

export function remapLocalInquiryId(localId: string, serverInquiry: InquiryResponseDto): void {
  const serverSavedInquiry = dtoToSavedInquiry(serverInquiry);
  const withoutLocal = inquiriesSnapshot.filter(
    (inquiry) => inquiry.id !== localId && inquiry.id !== serverInquiry.id,
  );
  setInquiriesStoreSnapshot(sortInquiries([serverSavedInquiry, ...withoutLocal]));
  writeCachedInquiries(inquiriesSnapshot);
  removePendingInquiryCreate(localId);

  try {
    cascadeInquiryIdRemap(localId, serverInquiry.id);
  } catch {
    // Best-effort — inquiry row is already remapped locally.
  }

  notifyInquiriesUpdated();
}

export function createInquiryOptimistic(payload: PendingInquiryCreatePayload): SavedInquiry {
  const studioId = getActiveStudioId();
  if (!studioId) {
    throw new Error("Studio context required");
  }
  return enqueueOptimisticCreate(studioId, payload);
}

function enqueueOptimisticCreate(
  studioId: string,
  payload: PendingInquiryCreatePayload,
): SavedInquiry {
  const duplicate = findDuplicateInSnapshot(payload);
  if (duplicate) {
    return duplicate;
  }

  const localId = createLocalInquiryId();
  const optimistic = buildOptimisticInquiry(localId, studioId, payload);
  enqueuePendingInquiryCreate({
    localId,
    studioId,
    payload,
    enqueuedAt: new Date().toISOString(),
  });
  upsertInquiryInSnapshot(optimistic);
  notifyInquiriesUpdated();
  return optimistic;
}

export async function createInquiryOfflineAware(
  payload: PendingInquiryCreatePayload,
): Promise<SavedInquiry> {
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
    return dtoToSavedInquiry(created);
  }

  const resolvedPayload = resolvePayloadProjectId(payload) ?? payload;
  const request = inquiriesApi.createInquiry(resolvedPayload);
  void request.catch(() => undefined);
  inFlightCreates.set(fingerprint, request);

  const createPromise = (async () => {
    try {
      const created = await withTimeout(request, CREATE_TIMEOUT_MS);
      const inquiry = dtoToSavedInquiry(created);
      upsertInquiryInSnapshot(inquiry);
      notifyInquiriesUpdated();
      return inquiry;
    } catch (error) {
      if (!isRetryableSyncFailure(error)) {
        throw error;
      }
      const optimistic = enqueueOptimisticCreate(studioId, payload);
      void request
        .then((created) => {
          updatePendingInquiryCreate(optimistic.id, { serverId: created.id }, studioId);
          remapLocalInquiryId(optimistic.id, created);
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

export async function flushPendingInquiryCreates(): Promise<void> {
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

    await (await import("@/lib/projects/store")).flushPendingProjectCreates();

    const pending = listPendingInquiryCreates(studioId);
    for (const entry of pending) {
      try {
        const resolvedPayload = resolvePayloadProjectId(entry.payload);
        if (!resolvedPayload) {
          continue;
        }

        const fingerprint = createPayloadFingerprint(resolvedPayload);
        const inflight = inFlightCreates.get(fingerprint);
        if (inflight) {
          try {
            const created = await inflight;
            updatePendingInquiryCreate(entry.localId, { serverId: created.id }, studioId);
            remapLocalInquiryId(entry.localId, created);
          } catch {
            // Original POST still failing — keep queued.
          }
          continue;
        }

        if (entry.serverId) {
          const existing = inquiriesSnapshot.find((inquiry) => inquiry.id === entry.serverId);
          if (existing) {
            remapLocalInquiryId(
              entry.localId,
              savedInquiryToResponseDto(existing, studioId),
            );
            continue;
          }
          try {
            const fetched = await inquiriesApi.getInquiry(entry.serverId);
            remapLocalInquiryId(entry.localId, fetched);
            continue;
          } catch {
            // Fall through and recreate if the remembered server id is gone.
          }
        }

        const duplicate = findDuplicateInSnapshot(resolvedPayload, entry.localId);
        if (duplicate) {
          updatePendingInquiryCreate(entry.localId, { serverId: duplicate.id }, studioId);
          remapLocalInquiryId(
            entry.localId,
            savedInquiryToResponseDto(duplicate, studioId),
          );
          continue;
        }

        const created = await withTimeout(
          inquiriesApi.createInquiry(resolvedPayload),
          CREATE_TIMEOUT_MS,
        );
        updatePendingInquiryCreate(entry.localId, { serverId: created.id }, studioId);
        remapLocalInquiryId(entry.localId, created);
      } catch {
        // Leave in queue for the next online/focus reconcile.
      }
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

export async function pushInquiryUpdateToApi(
  id: string,
  patch: Parameters<typeof savedInquiryPatchToUpdateDto>[0],
): Promise<void> {
  if (isLocalInquiryId(id) || !isBrowserOnline()) {
    return;
  }

  const resolvedPatch = { ...patch };
  if (resolvedPatch.projectId) {
    const resolved = resolveProjectIdForFlush(resolvedPatch.projectId);
    if (!resolved) {
      return;
    }
    resolvedPatch.projectId = resolved;
  }

  try {
    const updated = await inquiriesApi.updateInquiry(id, savedInquiryPatchToUpdateDto(resolvedPatch));
    upsertInquiryInSnapshot(dtoToSavedInquiry(updated));
    notifyInquiriesUpdated();
  } catch {
    // Soft-fail — next reconcile retries.
  }
}

export async function pushInquiryDeleteToApi(id: string): Promise<void> {
  if (isLocalInquiryId(id) || !isBrowserOnline()) {
    return;
  }

  try {
    await inquiriesApi.deleteInquiry(id);
  } catch {
    // Tombstone already applied locally.
  }
}

export { INQUIRIES_STORAGE_KEY };
