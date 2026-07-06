import { DEFAULT_BOOKING_SLOTS } from "./constants";
import type { BookingSlot, ProjectBooking } from "./types";

let bookingsSnapshot: ProjectBooking[] = [];
let bookingSlotsSnapshot: BookingSlot[] = DEFAULT_BOOKING_SLOTS;

export function getBookingsSnapshot(): ProjectBooking[] {
  return bookingsSnapshot;
}

export function setBookingsSnapshot(next: ProjectBooking[]): ProjectBooking[] {
  bookingsSnapshot = next;
  return bookingsSnapshot;
}

export function getBookingSlotsSnapshot(): BookingSlot[] {
  return bookingSlotsSnapshot;
}

export function setBookingSlotsSnapshot(next: BookingSlot[]): BookingSlot[] {
  bookingSlotsSnapshot = next;
  return bookingSlotsSnapshot;
}
