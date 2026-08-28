import type { CreateInquiryDto } from "@st-manager/contracts";

import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";

import { dtoToSavedInquiry } from "./map-dto";
import type { SavedInquiry } from "./types";

const PENDING_CREATES_KEY = "st-manager-inquiries-pending-creates";

export type PendingInquiryCreatePayload = CreateInquiryDto;

export interface PendingInquiryCreate {
  localId: string;
  studioId: string;
  payload: PendingInquiryCreatePayload;
  enqueuedAt: string;
  /** Set after API create succeeds so retries do not duplicate. */
  serverId?: string;
}

export function isLocalInquiryId(id: string): boolean {
  return id.startsWith("local_inq_");
}

export function createLocalInquiryId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `local_inq_${rand}`;
}

function readQueue(studioId: string | null = getActiveStudioId()): PendingInquiryCreate[] {
  if (!studioId) {
    return [];
  }
  try {
    const raw = readStudioScopedItem(PENDING_CREATES_KEY, studioId);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PendingInquiryCreate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(
  queue: PendingInquiryCreate[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) {
    return;
  }
  writeStudioScopedItem(PENDING_CREATES_KEY, JSON.stringify(queue), studioId);
}

export function listPendingInquiryCreates(
  studioId: string | null = getActiveStudioId(),
): PendingInquiryCreate[] {
  return readQueue(studioId);
}

export function enqueuePendingInquiryCreate(entry: PendingInquiryCreate): void {
  const queue = readQueue(entry.studioId).filter((item) => item.localId !== entry.localId);
  queue.push(entry);
  writeQueue(queue, entry.studioId);
}

export function updatePendingInquiryCreate(
  localId: string,
  patch: Partial<PendingInquiryCreate>,
  studioId: string | null = getActiveStudioId(),
): void {
  const queue = readQueue(studioId).map((item) =>
    item.localId === localId ? { ...item, ...patch } : item,
  );
  writeQueue(queue, studioId);
}

export function removePendingInquiryCreate(
  localId: string,
  studioId: string | null = getActiveStudioId(),
): void {
  writeQueue(
    readQueue(studioId).filter((item) => item.localId !== localId),
    studioId,
  );
}

export function buildOptimisticInquiry(
  localId: string,
  studioId: string,
  payload: PendingInquiryCreatePayload,
): SavedInquiry {
  const now = new Date().toISOString();
  return dtoToSavedInquiry({
    id: localId,
    studioId,
    inquiryNumber: "",
    status: payload.status ?? "inquiry",
    projectId: payload.projectId ?? null,
    advanceAmount: payload.advanceAmount ?? null,
    remainingBalance: payload.remainingBalance ?? null,
    form: payload.form,
    quotation: payload.quotation,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}
