import type { CreateStudioDocumentDto } from "@st-manager/contracts";

import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";

import { dtoToStudioDocument } from "./map-dto";
import type { StudioDocument } from "./types";

const PENDING_CREATES_KEY = "st-manager-documents-pending-creates";

export type PendingDocumentCreatePayload = CreateStudioDocumentDto;

export interface PendingDocumentCreate {
  localId: string;
  studioId: string;
  payload: PendingDocumentCreatePayload;
  enqueuedAt: string;
  serverId?: string;
}

export function isLocalDocumentId(id: string): boolean {
  return id.startsWith("local_doc_");
}

export function createLocalDocumentId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `local_doc_${rand}`;
}

function readQueue(studioId: string | null = getActiveStudioId()): PendingDocumentCreate[] {
  if (!studioId) {
    return [];
  }
  try {
    const raw = readStudioScopedItem(PENDING_CREATES_KEY, studioId);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PendingDocumentCreate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(
  queue: PendingDocumentCreate[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) {
    return;
  }
  writeStudioScopedItem(PENDING_CREATES_KEY, JSON.stringify(queue), studioId);
}

export function listPendingDocumentCreates(
  studioId: string | null = getActiveStudioId(),
): PendingDocumentCreate[] {
  return readQueue(studioId);
}

export function enqueuePendingDocumentCreate(entry: PendingDocumentCreate): void {
  const queue = readQueue(entry.studioId).filter((item) => item.localId !== entry.localId);
  queue.push(entry);
  writeQueue(queue, entry.studioId);
}

export function updatePendingDocumentCreate(
  localId: string,
  patch: Partial<PendingDocumentCreate>,
  studioId: string | null = getActiveStudioId(),
): void {
  const queue = readQueue(studioId).map((item) =>
    item.localId === localId ? { ...item, ...patch } : item,
  );
  writeQueue(queue, studioId);
}

export function removePendingDocumentCreate(
  localId: string,
  studioId: string | null = getActiveStudioId(),
): void {
  writeQueue(
    readQueue(studioId).filter((item) => item.localId !== localId),
    studioId,
  );
}

export function buildOptimisticStudioDocument(
  localId: string,
  payload: PendingDocumentCreatePayload,
): StudioDocument {
  const now = new Date().toISOString();
  return dtoToStudioDocument({
    id: localId,
    studioId: "",
    type: payload.type,
    documentNumber: "",
    inquiryId: payload.inquiryId ?? null,
    projectId: payload.projectId ?? null,
    paymentId: payload.paymentId ?? null,
    snapshot: payload.snapshot ?? null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}
