"use client";

import { useSyncExternalStore } from "react";

import { BOOKING_SLOTS_UPDATED_EVENT } from "@/lib/bookings/events";
import { getBookingSlotsSnapshot } from "@/lib/bookings/snapshots";
import { initializeBookingSlotSnapshots, loadAllSlots } from "@/lib/bookings/slot-storage";
import type { BookingSlot } from "@/lib/bookings/types";

let snapshotsReady = false;

function ensureSlotSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializeBookingSlotSnapshots();
  snapshotsReady = true;
}

export function useBookingSlots(): BookingSlot[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureSlotSnapshotsReady();

      const handler = () => {
        initializeBookingSlotSnapshots();
        onStoreChange();
      };

      window.addEventListener(BOOKING_SLOTS_UPDATED_EVENT, handler);
      return () => window.removeEventListener(BOOKING_SLOTS_UPDATED_EVENT, handler);
    },
    () => {
      ensureSlotSnapshotsReady();
      return getBookingSlotsSnapshot();
    },
    () => [],
  );
}

export function refreshBookingSlotsSnapshot(): BookingSlot[] {
  initializeBookingSlotSnapshots();
  return loadAllSlots();
}
