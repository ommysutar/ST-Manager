import type { ProjectResponseDto } from "@st-manager/contracts";

import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";
import { isBrowserOnline } from "@/lib/clients/network";
import { projectsApi } from "@/lib/api-client";

import { cascadeProjectIdRemap } from "./cascade-ids";
import { dtoToStudioProject, studioProjectToCreateDto } from "./map-dto";
import { isLocalProjectId } from "./offline-queue";
import type { StudioProject } from "./types";
import {
  getProjectsSnapshot,
  remapLocalProjectId,
} from "./store";

const ID_MAP_KEY = "st-manager-project-id-map";
const BACKFILL_REPORT_KEY = "st-manager-project-backfill-report";

type ProjectIdMap = Record<string, string>;

export interface LegacyProjectBackfillCandidate {
  localId: string;
  projectNumber: string;
  inquiryId?: string;
  projectName: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  alreadyMapped: boolean;
  serverId?: string;
}

export interface LegacyProjectBackfillAction {
  localId: string;
  action: "skip_mapped" | "match_server" | "create_server" | "skip_server_id";
  serverId?: string;
  reason: string;
}

export interface LegacyProjectBackfillReport {
  generatedAt: string;
  studioId: string;
  candidates: LegacyProjectBackfillCandidate[];
  plannedActions: LegacyProjectBackfillAction[];
}

/** Legacy browser-generated ids (`prj_*`), not offline queue (`local_prj_*`) or server cuid. */
export function isLegacyLocalProjectId(id: string): boolean {
  return id.startsWith("prj_") && !isLocalProjectId(id);
}

function isLikelyServerProjectId(id: string): boolean {
  return !isLocalProjectId(id) && !isLegacyLocalProjectId(id);
}

function readIdMap(studioId: string | null = getActiveStudioId()): ProjectIdMap {
  if (!studioId) return {};
  try {
    const raw = readStudioScopedItem(ID_MAP_KEY, studioId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProjectIdMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeIdMap(map: ProjectIdMap, studioId: string | null = getActiveStudioId()): void {
  if (!studioId) return;
  writeStudioScopedItem(ID_MAP_KEY, JSON.stringify(map), studioId);
}

function persistBackfillReport(report: LegacyProjectBackfillReport): void {
  const studioId = getActiveStudioId();
  if (!studioId) return;
  writeStudioScopedItem(BACKFILL_REPORT_KEY, JSON.stringify(report), studioId);
}

function findServerMatch(
  local: StudioProject,
  serverProjects: ProjectResponseDto[],
): ProjectResponseDto | undefined {
  const inquiryId = local.inquiryId?.trim();
  if (inquiryId) {
    const byInquiry = serverProjects.find(
      (project) => !project.deletedAt && project.inquiryId === inquiryId,
    );
    if (byInquiry) return byInquiry;
  }

  if (local.projectNumber) {
    const byNumber = serverProjects.find(
      (project) =>
        !project.deletedAt &&
        project.projectNumber.toLowerCase() === local.projectNumber.toLowerCase(),
    );
    if (byNumber) return byNumber;
  }

  const nameKey = `${local.projectName.trim().toLowerCase()}|${local.clientName.trim().toLowerCase()}`;
  return serverProjects.find((project) => {
    if (project.deletedAt) return false;
    const key = `${project.projectName.trim().toLowerCase()}|${project.clientName.trim().toLowerCase()}`;
    return key === nameKey;
  });
}

export function analyzeLegacyProjectBackfill(
  projects: StudioProject[] = getProjectsSnapshot(),
): LegacyProjectBackfillReport {
  const studioId = getActiveStudioId() ?? "unknown";
  const idMap = readIdMap(studioId === "unknown" ? null : studioId);

  const candidates: LegacyProjectBackfillCandidate[] = [];
  const plannedActions: LegacyProjectBackfillAction[] = [];

  for (const project of projects) {
    if (isLikelyServerProjectId(project.id)) {
      plannedActions.push({
        localId: project.id,
        action: "skip_server_id",
        serverId: project.id,
        reason: "Already a server-backed project id.",
      });
      continue;
    }

    if (isLocalProjectId(project.id)) {
      plannedActions.push({
        localId: project.id,
        action: "skip_mapped",
        reason: "Offline pending create — wait for flush, not legacy backfill.",
      });
      continue;
    }

    if (!isLegacyLocalProjectId(project.id)) {
      plannedActions.push({
        localId: project.id,
        action: "skip_mapped",
        reason: "Unknown id format — manual review required.",
      });
      continue;
    }

    const mappedServerId = idMap[project.id];
    candidates.push({
      localId: project.id,
      projectNumber: project.projectNumber,
      inquiryId: project.inquiryId,
      projectName: project.projectName,
      clientName: project.clientName,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      alreadyMapped: Boolean(mappedServerId),
      serverId: mappedServerId,
    });

    if (mappedServerId) {
      plannedActions.push({
        localId: project.id,
        action: "skip_mapped",
        serverId: mappedServerId,
        reason: "Already mapped in studio id map.",
      });
    } else {
      plannedActions.push({
        localId: project.id,
        action: "create_server",
        reason: "Will match existing server row or create once (idempotent).",
      });
    }
  }

  const report: LegacyProjectBackfillReport = {
    generatedAt: new Date().toISOString(),
    studioId,
    candidates,
    plannedActions,
  };
  persistBackfillReport(report);
  return report;
}

/**
 * Idempotent legacy project upload. Safe to run on every reconcile when online.
 * Does not create duplicates when inquiryId or projectNumber already exists server-side.
 */
export async function runLegacyProjectBackfill(): Promise<LegacyProjectBackfillReport> {
  const studioId = getActiveStudioId();
  if (!studioId || !isBrowserOnline()) {
    return analyzeLegacyProjectBackfill();
  }

  const locals = getProjectsSnapshot().filter((project) => isLegacyLocalProjectId(project.id));
  if (locals.length === 0) {
    return analyzeLegacyProjectBackfill();
  }

  const idMap = readIdMap(studioId);
  const serverProjects: ProjectResponseDto[] = [];
  let page = 1;
  while (page <= 20) {
    const response = await projectsApi.listProjects({ page, pageSize: 100 });
    serverProjects.push(...response.data);
    if (response.data.length < 100) break;
    page += 1;
  }

  for (const local of locals) {
    const existingMap = idMap[local.id];
    if (existingMap) {
      cascadeProjectIdRemap(local.id, existingMap);
      continue;
    }

    const match = findServerMatch(local, serverProjects);
    if (match) {
      idMap[local.id] = match.id;
      remapLocalProjectId(local.id, match);
      cascadeProjectIdRemap(local.id, match.id);
      continue;
    }

    try {
      const created = await projectsApi.createProject(studioProjectToCreateDto(local));
      idMap[local.id] = created.id;
      serverProjects.push(created);
      remapLocalProjectId(local.id, created);
      cascadeProjectIdRemap(local.id, created.id);
    } catch {
      // Leave for next reconcile — report captures pending candidates.
    }
  }

  writeIdMap(idMap, studioId);
  return analyzeLegacyProjectBackfill();
}

export function readLastBackfillReport(): LegacyProjectBackfillReport | null {
  const studioId = getActiveStudioId();
  if (!studioId) return null;
  try {
    const raw = readStudioScopedItem(BACKFILL_REPORT_KEY, studioId);
    if (!raw) return null;
    return JSON.parse(raw) as LegacyProjectBackfillReport;
  } catch {
    return null;
  }
}
