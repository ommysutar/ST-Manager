import type { BookingSlot } from "./types";

export const DEFAULT_BOOKING_SLOTS: BookingSlot[] = [
  {
    id: "slot_1",
    label: "11:00 AM – 2:00 PM",
    startHour: 11,
    startMinute: 0,
    endHour: 14,
    endMinute: 0,
    isCustom: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "slot_2",
    label: "3:00 PM – 6:00 PM",
    startHour: 15,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
    isCustom: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "slot_3",
    label: "7:00 PM – 9:00 PM",
    startHour: 19,
    startMinute: 0,
    endHour: 21,
    endMinute: 0,
    isCustom: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const BOOKING_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "booked", label: "Booked" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
