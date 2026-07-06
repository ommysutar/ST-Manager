export type BookingSlotId = "slot_1" | "slot_2" | "slot_3";
export type ProjectBookingStatus = "confirmed" | "cancelled";

/** Project-owned booking — single source of truth referenced by project.bookingIds */
export interface ProjectBooking {
  id: string;
  projectId: string;
  studioId: string;
  bookingFor: string;
  date: string;
  slotId: BookingSlotId;
  status: ProjectBookingStatus;
  clientName: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
}

export const BOOKINGS_STORAGE_KEY = "st-manager-project-bookings";
