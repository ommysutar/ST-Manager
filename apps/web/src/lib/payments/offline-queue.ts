import type { CreatePaymentDto } from "@st-manager/contracts";

import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";

import { dtoToPaymentRecord } from "./map-dto";
import type { PaymentRecord } from "./types";

const PENDING_CREATES_KEY = "st-manager-payments-pending-creates";

export type PendingPaymentCreatePayload = CreatePaymentDto;

export interface PendingPaymentCreate {
  localId: string;
  studioId: string;
  payload: PendingPaymentCreatePayload;
  enqueuedAt: string;
  serverId?: string;
}

export function isLocalPaymentId(id: string): boolean {
  return id.startsWith("local_pay_");
}

export function createLocalPaymentId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `local_pay_${rand}`;
}

function readQueue(studioId: string | null = getActiveStudioId()): PendingPaymentCreate[] {
  if (!studioId) {
    return [];
  }
  try {
    const raw = readStudioScopedItem(PENDING_CREATES_KEY, studioId);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PendingPaymentCreate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(
  queue: PendingPaymentCreate[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) {
    return;
  }
  writeStudioScopedItem(PENDING_CREATES_KEY, JSON.stringify(queue), studioId);
}

export function listPendingPaymentCreates(
  studioId: string | null = getActiveStudioId(),
): PendingPaymentCreate[] {
  return readQueue(studioId);
}

export function enqueuePendingPaymentCreate(entry: PendingPaymentCreate): void {
  const queue = readQueue(entry.studioId).filter((item) => item.localId !== entry.localId);
  queue.push(entry);
  writeQueue(queue, entry.studioId);
}

export function updatePendingPaymentCreate(
  localId: string,
  patch: Partial<PendingPaymentCreate>,
  studioId: string | null = getActiveStudioId(),
): void {
  const queue = readQueue(studioId).map((item) =>
    item.localId === localId ? { ...item, ...patch } : item,
  );
  writeQueue(queue, studioId);
}

export function removePendingPaymentCreate(
  localId: string,
  studioId: string | null = getActiveStudioId(),
): void {
  writeQueue(
    readQueue(studioId).filter((item) => item.localId !== localId),
    studioId,
  );
}

export function buildOptimisticPaymentRecord(
  localId: string,
  payload: PendingPaymentCreatePayload,
): PaymentRecord {
  const now = new Date().toISOString();
  return dtoToPaymentRecord({
    id: localId,
    studioId: "",
    projectId: payload.projectId,
    amount: Math.max(0, Math.round(payload.amount)),
    method: payload.method,
    notes: payload.notes ?? "",
    receivedBy: payload.receivedBy ?? "",
    source: payload.source ?? "manual",
    status: payload.status ?? "received",
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}
