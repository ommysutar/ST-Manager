import type { BookingSlot } from "./types";

export function slotStartMinutes(slot: Pick<BookingSlot, "startHour" | "startMinute">): number {
  return slot.startHour * 60 + slot.startMinute;
}

export function formatSlotTime(hour: number, minute: number): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatSlotTimeRange(slot: Pick<BookingSlot, "startHour" | "startMinute" | "endHour" | "endMinute">): string {
  return `${formatSlotTime(slot.startHour, slot.startMinute)} – ${formatSlotTime(slot.endHour, slot.endMinute)}`;
}

export function parseTimeInputValue(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(":").map((part) => Number.parseInt(part, 10));
  return { hour: hour || 0, minute: minute || 0 };
}

export function timeInputFromSlot(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function buildSlotLabelFromTimes(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
): string {
  return formatSlotTimeRange({ startHour, startMinute, endHour, endMinute });
}

export function getFirstSlotId(slots: BookingSlot[]): string {
  return slots[0]?.id ?? "";
}
