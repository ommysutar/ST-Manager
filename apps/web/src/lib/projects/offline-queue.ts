import type { CreateProjectDto } from "@st-manager/contracts";

import { dtoToStudioProject } from "./map-dto";
import type { StudioProject } from "./types";
import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";

const PENDING_CREATES_KEY = "st-manager-projects-pending-creates";

/** Non-secret project create payload queued for offline → online flush. */
export type PendingProjectCreatePayload = CreateProjectDto;

export interface PendingProjectCreate {
  localId: string;
  studioId: string;
  payload: PendingProjectCreatePayload;
  enqueuedAt: string;
  /** Set after API create succeeds so retries do not duplicate. */
  serverId?: string;
}

export function isLocalProjectId(id: string): boolean {
  return id.startsWith("local_prj_");
}

export function createLocalProjectId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `local_prj_${rand}`;
}

function readQueue(studioId: string | null = getActiveStudioId()): PendingProjectCreate[] {
  if (!studioId) {
    return [];
  }
  try {
    const raw = readStudioScopedItem(PENDING_CREATES_KEY, studioId);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PendingProjectCreate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(
  queue: PendingProjectCreate[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) {
    return;
  }
  writeStudioScopedItem(PENDING_CREATES_KEY, JSON.stringify(queue), studioId);
}

export function listPendingProjectCreates(
  studioId: string | null = getActiveStudioId(),
): PendingProjectCreate[] {
  return readQueue(studioId);
}

export function enqueuePendingProjectCreate(entry: PendingProjectCreate): void {
  const queue = readQueue(entry.studioId).filter((item) => item.localId !== entry.localId);
  queue.push(entry);
  writeQueue(queue, entry.studioId);
}

export function updatePendingProjectCreate(
  localId: string,
  patch: Partial<PendingProjectCreate>,
  studioId: string | null = getActiveStudioId(),
): void {
  const queue = readQueue(studioId).map((item) =>
    item.localId === localId ? { ...item, ...patch } : item,
  );
  writeQueue(queue, studioId);
}

export function removePendingProjectCreate(
  localId: string,
  studioId: string | null = getActiveStudioId(),
): void {
  writeQueue(
    readQueue(studioId).filter((item) => item.localId !== localId),
    studioId,
  );
}

export function buildOptimisticProject(
  localId: string,
  studioId: string,
  payload: PendingProjectCreatePayload,
): StudioProject {
  const now = new Date().toISOString();
  return dtoToStudioProject({
    id: localId,
    studioId,
    projectNumber: "",
    source: payload.source,
    inquiryId: payload.inquiryId ?? null,
    clientId: payload.clientId ?? null,
    projectName: payload.projectName,
    clientName: payload.clientName,
    clientMobile: payload.clientMobile ?? null,
    clientEmail: payload.clientEmail ?? null,
    projectCategory: payload.projectCategory ?? null,
    status: payload.status ?? "active",
    assignedEngineer: payload.assignedEngineer ?? "",
    planId: payload.planId ?? null,
    advanceReceived: payload.advanceReceived ?? 0,
    remainingBalance: payload.remainingBalance ?? 0,
    grandTotal: payload.grandTotal ?? 0,
    notes: payload.notes ?? null,
    selectedServiceIds: payload.selectedServiceIds ?? [],
    quotation: payload.quotation,
    tasks: payload.tasks ?? [],
    files: payload.files ?? [],
    links: payload.links ?? [],
    expenses: payload.expenses ?? [],
    sessionIds: payload.sessionIds ?? [],
    bookingIds: payload.bookingIds ?? [],
    invoiceIds: payload.invoiceIds ?? [],
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}
