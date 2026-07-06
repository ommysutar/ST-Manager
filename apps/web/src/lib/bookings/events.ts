export const BOOKINGS_UPDATED_EVENT = "st-manager-bookings-updated";

export function notifyBookingsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BOOKINGS_UPDATED_EVENT));
  }
}
