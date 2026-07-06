export const BOOKINGS_UPDATED_EVENT = "st-manager-bookings-updated";
export const BOOKING_SLOTS_UPDATED_EVENT = "st-manager-booking-slots-updated";

export function notifyBookingsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BOOKINGS_UPDATED_EVENT));
  }
}

export function notifyBookingSlotsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BOOKING_SLOTS_UPDATED_EVENT));
  }
}
