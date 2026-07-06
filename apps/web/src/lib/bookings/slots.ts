import { loadAllSlots } from "./slot-storage";
import type { BookingSlot, BookingSlotId } from "./types";

export function getBookingSlot(slotId: BookingSlotId): BookingSlot | undefined {
  return loadAllSlots().find((slot) => slot.id === slotId);
}

export function getBookingSlotLabel(slotId: BookingSlotId): string {
  return getBookingSlot(slotId)?.label ?? slotId;
}

export function formatBookingSlotTime(slotId: BookingSlotId): string {
  return getBookingSlotLabel(slotId);
}
