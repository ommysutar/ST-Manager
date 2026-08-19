import type { ClientResponseDto } from "@st-manager/contracts";

import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "./studio-scope";

const PENDING_CREATES_KEY = "st-manager-clients-pending-creates";

/** Non-secret client create payload queued for offline → online flush. */
export interface PendingClientCreatePayload {
  name: string;
  phone: string;
  whatsappNumber: string;
  whatsappSameAsPhone: boolean;
  email: string;
  company: string;
  notes: string;
}

export interface PendingClientCreate {
  localId: string;
  studioId: string;
  payload: PendingClientCreatePayload;
  enqueuedAt: string;
  /** Set after API create succeeds so retries do not duplicate. */
  serverId?: string;
}

export function isLocalClientId(id: string): boolean {
  return id.startsWith("local_cli_");
}

export function createLocalClientId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `local_cli_${rand}`;
}

function readQueue(studioId: string | null = getActiveStudioId()): PendingClientCreate[] {
  if (!studioId) {
    return [];
  }
  try {
    const raw = readStudioScopedItem(PENDING_CREATES_KEY, studioId);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PendingClientCreate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(
  queue: PendingClientCreate[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) {
    return;
  }
  writeStudioScopedItem(PENDING_CREATES_KEY, JSON.stringify(queue), studioId);
}

export function listPendingClientCreates(
  studioId: string | null = getActiveStudioId(),
): PendingClientCreate[] {
  return readQueue(studioId);
}

export function enqueuePendingClientCreate(entry: PendingClientCreate): void {
  const queue = readQueue(entry.studioId).filter((item) => item.localId !== entry.localId);
  queue.push(entry);
  writeQueue(queue, entry.studioId);
}

export function updatePendingClientCreate(
  localId: string,
  patch: Partial<PendingClientCreate>,
  studioId: string | null = getActiveStudioId(),
): void {
  const queue = readQueue(studioId).map((item) =>
    item.localId === localId ? { ...item, ...patch } : item,
  );
  writeQueue(queue, studioId);
}

export function removePendingClientCreate(
  localId: string,
  studioId: string | null = getActiveStudioId(),
): void {
  writeQueue(
    readQueue(studioId).filter((item) => item.localId !== localId),
    studioId,
  );
}

export function buildOptimisticClient(
  localId: string,
  studioId: string,
  payload: PendingClientCreatePayload,
): ClientResponseDto {
  const now = new Date().toISOString();
  return {
    id: localId,
    studioId,
    name: payload.name,
    displayNumber: "",
    email: payload.email || null,
    phone: payload.phone || null,
    whatsappNumber: payload.whatsappNumber || null,
    whatsappSameAsPhone: payload.whatsappSameAsPhone,
    company: payload.company || null,
    notes: payload.notes || null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
