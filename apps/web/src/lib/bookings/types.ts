export type BookingSlotId = string;
export type ProjectBookingStatus = "draft" | "booked" | "completed" | "cancelled";

/** Project-owned booking — single source of truth referenced by project.bookingIds */
export interface ProjectBooking {
  id: string;
  projectId: string;
  studioId: string;
  bookingFor: string;
  notes: string;
  date: string;
  slotId: BookingSlotId;
  status: ProjectBookingStatus;
  clientName: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
}

/** Booking slot — owner-configurable time window used by the booking calendar */
export interface BookingSlot {
  id: string;
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export const BOOKINGS_STORAGE_KEY = "st-manager-project-bookings";
export const BOOKING_SLOTS_STORAGE_KEY = "st-manager-booking-slots";

/** Statuses that occupy a studio/date/slot for double-booking checks. */
export const OCCUPYING_BOOKING_STATUSES: ProjectBookingStatus[] = ["draft", "booked", "completed"];
