"use client";

import { useSyncExternalStore } from "react";

import { EMPTY_BOOKINGS } from "@/hooks/empty-server-snapshots";
import { BOOKINGS_UPDATED_EVENT } from "@/lib/bookings/events";
import { requestProjectBookingApiReconcile } from "@/lib/bookings/reconcile";
import { hydrateBookingsSnapshotFromCache } from "@/lib/bookings/store";
import {
  getBookingsSnapshot,
  listBookings,
  listBookingsByProject,
} from "@/lib/bookings/storage";
import type { ProjectBooking } from "@/lib/bookings/types";

let snapshotsReady = false;
let reconcileStarted = false;

function ensureBookingSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializeBookingSnapshots();
  snapshotsReady = true;
}

function initializeBookingSnapshots(): void {
  hydrateBookingsSnapshotFromCache();
}

function ensureBookingReconcile(): void {
  if (typeof window === "undefined" || reconcileStarted) {
    return;
  }
  reconcileStarted = true;
  void requestProjectBookingApiReconcile();
}

export function useBookings(): ProjectBooking[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureBookingSnapshotsReady();
      ensureBookingReconcile();

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
    () => EMPTY_BOOKINGS,
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
