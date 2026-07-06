import { generateId } from "@/lib/inquiry/services";

import { DEFAULT_BOOKING_SLOTS } from "./constants";
import { notifyBookingSlotsUpdated } from "./events";
import { getBookingSlotsSnapshot, setBookingSlotsSnapshot } from "./snapshots";
import type { BookingSlot } from "./types";
import { BOOKING_SLOTS_STORAGE_KEY } from "./types";

export interface CreateCustomSlotInput {
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

function normalizeSlot(raw: Partial<BookingSlot> & { id: string }): BookingSlot {
  const now = new Date().toISOString();
  return {
    id: raw.id,
    label: raw.label?.trim() || "Custom Slot",
    startHour: raw.startHour ?? 0,
    startMinute: raw.startMinute ?? 0,
    endHour: raw.endHour ?? 0,
    endMinute: raw.endMinute ?? 0,
    isCustom: raw.isCustom ?? true,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
}

function readSlotsFromStorage(): BookingSlot[] {
  if (typeof window === "undefined") {
    return DEFAULT_BOOKING_SLOTS;
  }

  try {
    const raw = localStorage.getItem(BOOKING_SLOTS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_BOOKING_SLOTS;
    }

    const parsed = JSON.parse(raw) as Partial<BookingSlot>[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_BOOKING_SLOTS;
    }

    return parsed.map((slot) => normalizeSlot(slot as BookingSlot));
  } catch {
    return DEFAULT_BOOKING_SLOTS;
  }
}

function sortSlots(slots: BookingSlot[]): BookingSlot[] {
  return [...slots].sort(
    (a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute),
  );
}

function persistSlots(slots: BookingSlot[]): BookingSlot[] {
  const sorted = sortSlots(slots);
  localStorage.setItem(BOOKING_SLOTS_STORAGE_KEY, JSON.stringify(sorted));
  setBookingSlotsSnapshot(sorted);
  notifyBookingSlotsUpdated();
  return sorted;
}

function slotStartMinutes(slot: Pick<BookingSlot, "startHour" | "startMinute">): number {
  return slot.startHour * 60 + slot.startMinute;
}

function slotEndMinutes(slot: Pick<BookingSlot, "endHour" | "endMinute">): number {
  return slot.endHour * 60 + slot.endMinute;
}

function slotsOverlap(
  left: Pick<BookingSlot, "startHour" | "startMinute" | "endHour" | "endMinute">,
  right: BookingSlot,
): boolean {
  return (
    slotStartMinutes(left) < slotEndMinutes(right) &&
    slotStartMinutes(right) < slotEndMinutes(left)
  );
}

function findOverlappingSlot(
  candidate: Pick<BookingSlot, "startHour" | "startMinute" | "endHour" | "endMinute">,
): BookingSlot | undefined {
  return readSlotsFromStorage().find((existing) => slotsOverlap(candidate, existing));
}

export function loadAllSlots(): BookingSlot[] {
  return sortSlots(readSlotsFromStorage());
}

export function getSlot(id: string): BookingSlot | undefined {
  return loadAllSlots().find((slot) => slot.id === id);
}

export function createCustomSlot(input: CreateCustomSlotInput): BookingSlot {
  const startTotal = input.startHour * 60 + input.startMinute;
  const endTotal = input.endHour * 60 + input.endMinute;
  if (endTotal <= startTotal) {
    throw new Error("End time must be after start time.");
  }

  const overlap = findOverlappingSlot(input);
  if (overlap) {
    throw new Error(`Slot overlaps with "${overlap.label}".`);
  }

  const now = new Date().toISOString();
  const slot = normalizeSlot({
    id: generateId("slot"),
    label: input.label,
    startHour: input.startHour,
    startMinute: input.startMinute,
    endHour: input.endHour,
    endMinute: input.endMinute,
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  });

  persistSlots([...loadAllSlots(), slot]);
  return slot;
}

export function deleteCustomSlot(id: string): boolean {
  const slots = loadAllSlots();
  const target = slots.find((slot) => slot.id === id);
  if (!target || !target.isCustom) {
    return false;
  }

  persistSlots(slots.filter((slot) => slot.id !== id));
  return true;
}

export function initializeBookingSlotSnapshots(): void {
  setBookingSlotsSnapshot(loadAllSlots());
}

export { getBookingSlotsSnapshot };
