import { loadAllSlots } from "./slot-storage";
import type { BookingSlot, BookingSlotId } from "./types";

export function slotStartMinutes(slot: BookingSlot): number {
  return slot.startHour * 60 + slot.startMinute;
}

export function slotEndMinutes(slot: BookingSlot): number {
  return slot.endHour * 60 + slot.endMinute;
}

/** True when two slots share any minute on the clock (used to block overlapping custom slots). */
export function slotsOverlap(left: BookingSlot, right: BookingSlot): boolean {
  const leftStart = slotStartMinutes(left);
  const leftEnd = slotEndMinutes(left);
  const rightStart = slotStartMinutes(right);
  const rightEnd = slotEndMinutes(right);
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function getBookingSlot(slotId: BookingSlotId): BookingSlot | undefined {
  return loadAllSlots().find((slot) => slot.id === slotId);
}

export function getBookingSlotLabel(slotId: BookingSlotId): string {
  return getBookingSlot(slotId)?.label ?? slotId;
}

export function formatBookingSlotTime(slotId: BookingSlotId): string {
  return getBookingSlotLabel(slotId);
}
