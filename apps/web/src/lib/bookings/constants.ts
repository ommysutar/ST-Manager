import { getDefaultBookingSlots } from "@/lib/demo-data";

import type { BookingSlot } from "./types";

export const DEFAULT_BOOKING_SLOTS: BookingSlot[] = getDefaultBookingSlots();

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
