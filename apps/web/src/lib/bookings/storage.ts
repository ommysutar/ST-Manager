import { ApiError } from "@st-manager/api-sdk";

import { projectBookingsApi } from "@/lib/api-client";
import { getProject, updateProject } from "@/lib/projects/storage";
import { isBrowserOnline } from "@/lib/sync";

import { notifyBookingsUpdated } from "./events";
import { dtoToProjectBooking, projectBookingToUpdateDto } from "./map-dto";
import {
  createProjectBookingOfflineAware,
  flushPendingProjectBookingCreates,
  getBookingsStoreSnapshot,
  hydrateBookingsSnapshotFromCache,
  isLocalBookingId,
  isSlotAvailableInSnapshot,
  removeBookingFromSnapshot,
  upsertBookingInSnapshot,
} from "./store";
import { getBookingsSnapshot, setBookingsSnapshot } from "./snapshots";
import type { BookingSlotId, ProjectBooking, ProjectBookingStatus } from "./types";
import { BOOKINGS_STORAGE_KEY, OCCUPYING_BOOKING_STATUSES } from "./types";

export interface CreateBookingInput {
  projectId: string;
  studioId: string;
  bookingFor: string;
  notes?: string;
  date: string;
  slotId: BookingSlotId;
  status?: ProjectBookingStatus;
}

export interface UpdateBookingInput {
  studioId?: string;
  bookingFor?: string;
  notes?: string;
  date?: string;
  slotId?: BookingSlotId;
  status?: ProjectBookingStatus;
}

const DOUBLE_BOOKING_ERROR = "Studio already booked.";

function normalizeStatus(raw: unknown): ProjectBookingStatus {
  if (raw === "confirmed") {
    return "booked";
  }
  if (raw === "draft" || raw === "booked" || raw === "completed" || raw === "cancelled") {
    return raw;
  }
  return "booked";
}

function normalizeBooking(raw: Partial<ProjectBooking> & { id: string }): ProjectBooking {
  const now = new Date().toISOString();
  return {
    id: raw.id,
    projectId: String(raw.projectId),
    studioId: String(raw.studioId),
    bookingFor: raw.bookingFor?.trim() || "Studio Session",
    notes: raw.notes?.trim() ?? "",
    date: String(raw.date),
    slotId: raw.slotId ?? "",
    status: normalizeStatus(raw.status),
    clientName: raw.clientName ?? "",
    projectName: raw.projectName ?? "",
    projectNumber: raw.projectNumber ?? "",
    engineerId: raw.engineerId ?? null,
    sessionId: raw.sessionId ?? null,
    attendanceRecorded: raw.attendanceRecorded ?? false,
    equipmentIds: Array.isArray(raw.equipmentIds) ? raw.equipmentIds : [],
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
}

function ensureBookingsHydrated(): ProjectBooking[] {
  if (getBookingsStoreSnapshot().length === 0) {
    hydrateBookingsSnapshotFromCache();
  }
  return getBookingsStoreSnapshot();
}

export function loadAllBookings(): ProjectBooking[] {
  return ensureBookingsHydrated();
}

export function listBookings(): ProjectBooking[] {
  return loadAllBookings();
}

export function getBooking(id: string): ProjectBooking | undefined {
  return loadAllBookings().find((booking) => booking.id === id);
}

export function listBookingsByProject(projectId: string): ProjectBooking[] {
  return loadAllBookings().filter((booking) => booking.projectId === projectId);
}

export function listBookingsInRange(from: Date, to: Date): ProjectBooking[] {
  const fromTime = from.getTime();
  const toTime = to.getTime();

  return loadAllBookings().filter((booking) => {
    const dayTime = new Date(`${booking.date}T12:00:00`).getTime();
    return dayTime >= fromTime && dayTime < toTime;
  });
}

export function isSlotAvailable(
  studioId: string,
  date: string,
  slotId: BookingSlotId,
  excludeBookingId?: string,
): boolean {
  ensureBookingsHydrated();
  return isSlotAvailableInSnapshot(studioId, date, slotId, excludeBookingId);
}

export async function createBooking(input: CreateBookingInput): Promise<ProjectBooking> {
  const project = getProject(input.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const status = input.status ?? "booked";
  if (
    OCCUPYING_BOOKING_STATUSES.includes(status) &&
    !isSlotAvailable(input.studioId, input.date, input.slotId)
  ) {
    throw new Error(DOUBLE_BOOKING_ERROR);
  }

  const payload = {
    projectId: project.id,
    roomStudioId: input.studioId,
    bookingFor: input.bookingFor.trim() || "Studio Session",
    notes: input.notes?.trim() ?? "",
    date: input.date,
    slotId: input.slotId,
    status,
    clientName: project.clientName,
    projectName: project.projectName,
    projectNumber: project.projectNumber,
  };

  const booking = await createProjectBookingOfflineAware(payload);

  if (!project.bookingIds.includes(booking.id)) {
    updateProject(project.id, {
      bookingIds: [booking.id, ...project.bookingIds],
    });
  }

  if (isBrowserOnline()) {
    void flushPendingProjectBookingCreates();
  }

  return booking;
}

export function updateBooking(id: string, patch: UpdateBookingInput): ProjectBooking {
  const bookings = loadAllBookings();
  const index = bookings.findIndex((booking) => booking.id === id);
  if (index === -1) {
    throw new Error("Booking not found.");
  }

  const current = bookings[index];
  const nextStudioId = patch.studioId ?? current.studioId;
  const nextDate = patch.date ?? current.date;
  const nextSlotId = patch.slotId ?? current.slotId;
  const nextStatus = patch.status ?? current.status;

  const isMovingSlot =
    nextStudioId !== current.studioId || nextDate !== current.date || nextSlotId !== current.slotId;

  if (
    OCCUPYING_BOOKING_STATUSES.includes(nextStatus) &&
    (isMovingSlot || nextStatus !== current.status) &&
    !isSlotAvailable(nextStudioId, nextDate, nextSlotId, current.id)
  ) {
    throw new Error(DOUBLE_BOOKING_ERROR);
  }

  const updated = normalizeBooking({
    ...current,
    ...patch,
    id: current.id,
    updatedAt: new Date().toISOString(),
  });

  upsertBookingInSnapshot(updated);
  notifyBookingsUpdated();

  if (!isLocalBookingId(id) && isBrowserOnline()) {
    void projectBookingsApi
      .updateProjectBooking(id, projectBookingToUpdateDto(patch))
      .then((dto) => {
        upsertBookingInSnapshot(dtoToProjectBooking(dto));
        notifyBookingsUpdated();
      })
      .catch((error) => {
        if (error instanceof ApiError && error.code === "SLOT_CONFLICT") {
          throw new Error(DOUBLE_BOOKING_ERROR);
        }
      });
  }

  return updated;
}

export function cancelBooking(id: string): ProjectBooking | null {
  try {
    return updateBooking(id, { status: "cancelled" });
  } catch {
    return null;
  }
}

export function updateBookingStatus(id: string, status: ProjectBookingStatus): ProjectBooking | null {
  try {
    return updateBooking(id, { status });
  } catch {
    return null;
  }
}

export function rescheduleBooking(
  id: string,
  date: string,
  slotId: BookingSlotId,
  studioId?: string,
): ProjectBooking {
  return updateBooking(id, studioId ? { date, slotId, studioId } : { date, slotId });
}

export function deleteBooking(id: string): void {
  removeBookingFromSnapshot(id);
  notifyBookingsUpdated();

  if (!isLocalBookingId(id) && isBrowserOnline()) {
    void projectBookingsApi.deleteProjectBooking(id).catch(() => undefined);
  }
}

export function initializeBookingSnapshots(): void {
  hydrateBookingsSnapshotFromCache();
  setBookingsSnapshot(getBookingsStoreSnapshot());
}

export { getBookingsSnapshot, BOOKINGS_STORAGE_KEY, flushPendingProjectBookingCreates };
