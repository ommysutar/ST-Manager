import type { CreateProjectBookingDto } from "@st-manager/contracts";

import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";

import { dtoToProjectBooking } from "./map-dto";
import type { ProjectBooking } from "./types";

const PENDING_CREATES_KEY = "st-manager-project-bookings-pending-creates";

export type PendingProjectBookingCreatePayload = CreateProjectBookingDto;

export interface PendingProjectBookingCreate {
  localId: string;
  studioId: string;
  payload: PendingProjectBookingCreatePayload;
  enqueuedAt: string;
  serverId?: string;
  slotConflict?: boolean;
}

export function isLocalBookingId(id: string): boolean {
  return id.startsWith("local_bkg_");
}

export function createLocalBookingId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `local_bkg_${rand}`;
}

function readQueue(studioId: string | null = getActiveStudioId()): PendingProjectBookingCreate[] {
  if (!studioId) {
    return [];
  }
  try {
    const raw = readStudioScopedItem(PENDING_CREATES_KEY, studioId);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PendingProjectBookingCreate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(
  queue: PendingProjectBookingCreate[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) {
    return;
  }
  writeStudioScopedItem(PENDING_CREATES_KEY, JSON.stringify(queue), studioId);
}

export function listPendingProjectBookingCreates(
  studioId: string | null = getActiveStudioId(),
): PendingProjectBookingCreate[] {
  return readQueue(studioId);
}

export function enqueuePendingProjectBookingCreate(entry: PendingProjectBookingCreate): void {
  const queue = readQueue(entry.studioId).filter((item) => item.localId !== entry.localId);
  queue.push(entry);
  writeQueue(queue, entry.studioId);
}

export function updatePendingProjectBookingCreate(
  localId: string,
  patch: Partial<PendingProjectBookingCreate>,
  studioId: string | null = getActiveStudioId(),
): void {
  const queue = readQueue(studioId).map((item) =>
    item.localId === localId ? { ...item, ...patch } : item,
  );
  writeQueue(queue, studioId);
}

export function removePendingProjectBookingCreate(
  localId: string,
  studioId: string | null = getActiveStudioId(),
): void {
  writeQueue(
    readQueue(studioId).filter((item) => item.localId !== localId),
    studioId,
  );
}

export function buildOptimisticProjectBooking(
  localId: string,
  payload: PendingProjectBookingCreatePayload,
): ProjectBooking {
  const now = new Date().toISOString();
  return dtoToProjectBooking({
    id: localId,
    studioId: "",
    projectId: payload.projectId,
    roomStudioId: payload.roomStudioId,
    clientId: payload.clientId ?? null,
    bookingFor: payload.bookingFor,
    notes: payload.notes ?? "",
    date: payload.date,
    slotId: payload.slotId,
    status: payload.status ?? "booked",
    clientName: payload.clientName,
    projectName: payload.projectName,
    projectNumber: payload.projectNumber ?? "",
    engineerId: payload.engineerId ?? null,
    sessionId: payload.sessionId ?? null,
    attendanceRecorded: payload.attendanceRecorded ?? false,
    equipmentIds: payload.equipmentIds ?? [],
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}
