import { BOOKING_SLOTS } from "./constants";
import type { BookingSlotId } from "./types";

export function getBookingSlot(slotId: BookingSlotId) {
  return BOOKING_SLOTS.find((slot) => slot.id === slotId);
}

export function getBookingSlotLabel(slotId: BookingSlotId): string {
  return getBookingSlot(slotId)?.label ?? slotId;
}

export function formatBookingSlotTime(slotId: BookingSlotId): string {
  return getBookingSlotLabel(slotId);
}
