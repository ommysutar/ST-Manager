import type { ProjectBooking } from "./types";

let bookingsSnapshot: ProjectBooking[] = [];

export function getBookingsSnapshot(): ProjectBooking[] {
  return bookingsSnapshot;
}

export function setBookingsSnapshot(next: ProjectBooking[]): ProjectBooking[] {
  bookingsSnapshot = next;
  return bookingsSnapshot;
}
