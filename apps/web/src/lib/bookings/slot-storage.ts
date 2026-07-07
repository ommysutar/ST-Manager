import { generateId } from "@/lib/inquiry/services";

import { DEFAULT_BOOKING_SLOTS } from "./constants";
import { notifyBookingSlotsUpdated } from "./events";
import { getBookingSlotsSnapshot, setBookingSlotsSnapshot } from "./snapshots";
import { slotStartMinutes } from "./slot-utils";
import type { BookingSlot, ProjectBookingStatus } from "./types";
import { BOOKING_SLOTS_STORAGE_KEY, BOOKINGS_STORAGE_KEY, OCCUPYING_BOOKING_STATUSES } from "./types";

export interface CreateSlotInput {
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isCustom?: boolean;
}

export interface UpdateSlotInput {
  label?: string;
  startHour?: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
}

/** @deprecated Use createSlot */
export type CreateCustomSlotInput = CreateSlotInput;

function normalizeSlot(raw: Partial<BookingSlot> & { id: string }, index: number): BookingSlot {
  const now = new Date().toISOString();
  return {
    id: raw.id,
    label: raw.label?.trim() || "Booking Slot",
    startHour: raw.startHour ?? 0,
    startMinute: raw.startMinute ?? 0,
    endHour: raw.endHour ?? 0,
    endMinute: raw.endMinute ?? 0,
    isCustom: raw.isCustom ?? false,
    sortOrder: raw.sortOrder ?? index,
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

    return parsed.map((slot, index) => normalizeSlot(slot as BookingSlot, index));
  } catch {
    return DEFAULT_BOOKING_SLOTS;
  }
}

function sortSlots(slots: BookingSlot[]): BookingSlot[] {
  return [...slots].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return slotStartMinutes(a) - slotStartMinutes(b);
  });
}

function persistSlots(slots: BookingSlot[]): BookingSlot[] {
  const sorted = sortSlots(slots);
  localStorage.setItem(BOOKING_SLOTS_STORAGE_KEY, JSON.stringify(sorted));
  setBookingSlotsSnapshot(sorted);
  notifyBookingSlotsUpdated();
  return sorted;
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
  excludeId?: string,
): BookingSlot | undefined {
  return readSlotsFromStorage().find(
    (existing) => existing.id !== excludeId && slotsOverlap(candidate, existing),
  );
}

function validateTimeRange(input: Pick<CreateSlotInput, "startHour" | "startMinute" | "endHour" | "endMinute">): void {
  const startTotal = input.startHour * 60 + input.startMinute;
  const endTotal = input.endHour * 60 + input.endMinute;
  if (endTotal <= startTotal) {
    throw new Error("End time must be after start time.");
  }
}

function slotIsInUse(id: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw) as { slotId?: string; status?: ProjectBookingStatus }[];
    if (!Array.isArray(parsed)) {
      return false;
    }

    return parsed.some(
      (booking) =>
        booking.slotId === id &&
        booking.status !== undefined &&
        OCCUPYING_BOOKING_STATUSES.includes(booking.status),
    );
  } catch {
    return false;
  }
}

export function loadAllSlots(): BookingSlot[] {
  return sortSlots(readSlotsFromStorage());
}

export function getSlot(id: string): BookingSlot | undefined {
  return loadAllSlots().find((slot) => slot.id === id);
}

export function createSlot(input: CreateSlotInput): BookingSlot {
  validateTimeRange(input);

  const overlap = findOverlappingSlot(input);
  if (overlap) {
    throw new Error(`Slot overlaps with "${overlap.label}".`);
  }

  const now = new Date().toISOString();
  const existing = loadAllSlots();
  const slot = normalizeSlot(
    {
      id: generateId("slot"),
      label: input.label,
      startHour: input.startHour,
      startMinute: input.startMinute,
      endHour: input.endHour,
      endMinute: input.endMinute,
      isCustom: input.isCustom ?? true,
      sortOrder: existing.length,
      createdAt: now,
      updatedAt: now,
    },
    existing.length,
  );

  persistSlots([...existing, slot]);
  return slot;
}

export function createCustomSlot(input: CreateSlotInput): BookingSlot {
  return createSlot({ ...input, isCustom: true });
}

export function updateSlot(id: string, patch: UpdateSlotInput): BookingSlot {
  const slots = loadAllSlots();
  const index = slots.findIndex((slot) => slot.id === id);
  if (index === -1) {
    throw new Error("Slot not found.");
  }

  const current = slots[index];
  const next = {
    startHour: patch.startHour ?? current.startHour,
    startMinute: patch.startMinute ?? current.startMinute,
    endHour: patch.endHour ?? current.endHour,
    endMinute: patch.endMinute ?? current.endMinute,
  };

  validateTimeRange(next);

  const overlap = findOverlappingSlot(next, id);
  if (overlap) {
    throw new Error(`Slot overlaps with "${overlap.label}".`);
  }

  const updated = normalizeSlot(
    {
      ...current,
      ...patch,
      ...next,
      id: current.id,
      updatedAt: new Date().toISOString(),
    },
    current.sortOrder,
  );

  slots[index] = updated;
  persistSlots(slots);
  return updated;
}

export function deleteSlot(id: string): boolean {
  const slots = loadAllSlots();
  if (!slots.some((slot) => slot.id === id)) {
    return false;
  }

  if (slotIsInUse(id)) {
    throw new Error("Cannot delete a slot that has active bookings.");
  }

  const next = slots.filter((slot) => slot.id !== id).map((slot, index) => ({
    ...slot,
    sortOrder: index,
  }));
  persistSlots(next);
  return true;
}

export function deleteCustomSlot(id: string): boolean {
  return deleteSlot(id);
}

export function reorderSlots(orderedIds: string[]): BookingSlot[] {
  const slots = loadAllSlots();
  const byId = new Map(slots.map((slot) => [slot.id, slot]));

  if (orderedIds.length !== slots.length || orderedIds.some((id) => !byId.has(id))) {
    throw new Error("Invalid slot order.");
  }

  const reordered = orderedIds.map((id, index) => ({
    ...byId.get(id)!,
    sortOrder: index,
    updatedAt: new Date().toISOString(),
  }));

  return persistSlots(reordered);
}

export function initializeBookingSlotSnapshots(): void {
  setBookingSlotsSnapshot(loadAllSlots());
}

export { getBookingSlotsSnapshot };
