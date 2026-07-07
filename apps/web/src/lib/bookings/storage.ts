import { generateId } from "@/lib/inquiry/services";
import { getProject, updateProject } from "@/lib/projects/storage";

import { notifyBookingsUpdated } from "./events";
import { loadAllSlots } from "./slot-storage";
import { setBookingsSnapshot } from "./snapshots";
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
    // Legacy Sprint 3 data migrated to the new status model.
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
    slotId: raw.slotId ?? loadAllSlots()[0]?.id ?? "",
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

function readBookingsFromStorage(): ProjectBooking[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<ProjectBooking>[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((entry) => normalizeBooking(entry as ProjectBooking));
  } catch {
    return [];
  }
}

function persistBookings(bookings: ProjectBooking[]): ProjectBooking[] {
  const sorted = [...bookings].sort(
    (a, b) =>
      new Date(`${a.date}T00:00:00`).getTime() - new Date(`${b.date}T00:00:00`).getTime() ||
      a.slotId.localeCompare(b.slotId),
  );
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(sorted));
  setBookingsSnapshot(sorted);
  notifyBookingsUpdated();
  return sorted;
}

export function loadAllBookings(): ProjectBooking[] {
  return readBookingsFromStorage();
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
  return !loadAllBookings().some(
    (booking) =>
      OCCUPYING_BOOKING_STATUSES.includes(booking.status) &&
      booking.studioId === studioId &&
      booking.date === date &&
      booking.slotId === slotId &&
      booking.id !== excludeBookingId,
  );
}

export function createBooking(input: CreateBookingInput): ProjectBooking {
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

  const now = new Date().toISOString();
  const booking = normalizeBooking({
    id: generateId("bkg"),
    projectId: project.id,
    studioId: input.studioId,
    bookingFor: input.bookingFor,
    notes: input.notes,
    date: input.date,
    slotId: input.slotId,
    status,
    clientName: project.clientName,
    projectName: project.projectName,
    projectNumber: project.projectNumber,
    createdAt: now,
    updatedAt: now,
  });

  persistBookings([booking, ...loadAllBookings()]);

  if (!project.bookingIds.includes(booking.id)) {
    updateProject(project.id, {
      bookingIds: [booking.id, ...project.bookingIds],
    });
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

  bookings[index] = updated;
  persistBookings(bookings);
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

export function initializeBookingSnapshots(): void {
  setBookingsSnapshot(loadAllBookings());
}

export { getBookingsSnapshot } from "./snapshots";
