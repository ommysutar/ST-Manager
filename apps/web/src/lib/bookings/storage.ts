import { generateId } from "@/lib/inquiry/services";
import { getProject, updateProject } from "@/lib/projects/storage";

import { notifyBookingsUpdated } from "./events";
import { setBookingsSnapshot } from "./snapshots";
import type { BookingSlotId, ProjectBooking, ProjectBookingStatus } from "./types";
import { BOOKINGS_STORAGE_KEY } from "./types";

export interface CreateBookingInput {
  projectId: string;
  studioId: string;
  bookingFor: string;
  date: string;
  slotId: BookingSlotId;
}

function normalizeBooking(raw: Partial<ProjectBooking> & { id: string }): ProjectBooking {
  const now = new Date().toISOString();
  return {
    id: raw.id,
    projectId: String(raw.projectId),
    studioId: String(raw.studioId),
    bookingFor: raw.bookingFor?.trim() || "Studio Session",
    date: String(raw.date),
    slotId: raw.slotId ?? "slot_1",
    status: raw.status ?? "confirmed",
    clientName: raw.clientName ?? "",
    projectName: raw.projectName ?? "",
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
      booking.status === "confirmed" &&
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

  if (!isSlotAvailable(input.studioId, input.date, input.slotId)) {
    throw new Error("This studio slot is already booked.");
  }

  const now = new Date().toISOString();
  const booking = normalizeBooking({
    id: generateId("bkg"),
    projectId: project.id,
    studioId: input.studioId,
    bookingFor: input.bookingFor,
    date: input.date,
    slotId: input.slotId,
    status: "confirmed",
    clientName: project.clientName,
    projectName: project.projectName,
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

export function cancelBooking(id: string): ProjectBooking | null {
  const bookings = loadAllBookings();
  const index = bookings.findIndex((booking) => booking.id === id);
  if (index === -1) {
    return null;
  }

  const updated = normalizeBooking({
    ...bookings[index],
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  });

  bookings[index] = updated;
  persistBookings(bookings);
  return updated;
}

export function updateBookingStatus(id: string, status: ProjectBookingStatus): ProjectBooking | null {
  const bookings = loadAllBookings();
  const index = bookings.findIndex((booking) => booking.id === id);
  if (index === -1) {
    return null;
  }

  const updated = normalizeBooking({
    ...bookings[index],
    status,
    updatedAt: new Date().toISOString(),
  });

  bookings[index] = updated;
  persistBookings(bookings);
  return updated;
}

export function initializeBookingSnapshots(): void {
  setBookingsSnapshot(loadAllBookings());
}

export { getBookingsSnapshot } from "./snapshots";
