"use client";

import { useSyncExternalStore } from "react";

import { BOOKINGS_UPDATED_EVENT } from "@/lib/bookings/events";
import {
  getBookingsSnapshot,
  initializeBookingSnapshots,
  listBookings,
  listBookingsByProject,
} from "@/lib/bookings/storage";
import type { ProjectBooking } from "@/lib/bookings/types";

let snapshotsReady = false;

function ensureBookingSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializeBookingSnapshots();
  snapshotsReady = true;
}

export function useBookings(): ProjectBooking[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureBookingSnapshotsReady();

      const handler = () => {
        initializeBookingSnapshots();
        onStoreChange();
      };

      window.addEventListener(BOOKINGS_UPDATED_EVENT, handler);
      window.addEventListener("st-manager-projects-updated", handler);
      return () => {
        window.removeEventListener(BOOKINGS_UPDATED_EVENT, handler);
        window.removeEventListener("st-manager-projects-updated", handler);
      };
    },
    () => {
      ensureBookingSnapshotsReady();
      return getBookingsSnapshot();
    },
    () => [],
  );
}

export function useProjectBookings(projectId: string): ProjectBooking[] {
  const all = useBookings();
  return all.filter((booking) => booking.projectId === projectId);
}

export function refreshBookingsSnapshot(): ProjectBooking[] {
  initializeBookingSnapshots();
  return listBookings();
}

export function refreshProjectBookings(projectId: string): ProjectBooking[] {
  return listBookingsByProject(projectId);
}
