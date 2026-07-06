import type { BookingSlotId } from "./types";

export interface BookingSlotDefinition {
  id: BookingSlotId;
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export const BOOKING_SLOTS: BookingSlotDefinition[] = [
  {
    id: "slot_1",
    label: "11:00 AM – 2:00 PM",
    startHour: 11,
    startMinute: 0,
    endHour: 14,
    endMinute: 0,
  },
  {
    id: "slot_2",
    label: "3:00 PM – 6:00 PM",
    startHour: 15,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
  },
  {
    id: "slot_3",
    label: "7:00 PM – 9:00 PM",
    startHour: 19,
    startMinute: 0,
    endHour: 21,
    endMinute: 0,
  },
];

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};
