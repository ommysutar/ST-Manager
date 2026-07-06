"use client";

import { useSyncExternalStore } from "react";

import { STUDIOS_UPDATED_EVENT } from "@/lib/studios/events";
import {
  getActiveStudiosSnapshot,
  getStudiosSnapshot,
} from "@/lib/studios/snapshots";
import {
  initializeStudioSnapshots,
  loadAllStudios,
} from "@/lib/studios/storage";
import type { StudioRoom } from "@/lib/studios/types";

let snapshotsReady = false;

function ensureStudioSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializeStudioSnapshots();
  snapshotsReady = true;
}

export function useStudios(): StudioRoom[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureStudioSnapshotsReady();

      const handler = () => {
        initializeStudioSnapshots();
        onStoreChange();
      };

      window.addEventListener(STUDIOS_UPDATED_EVENT, handler);
      return () => window.removeEventListener(STUDIOS_UPDATED_EVENT, handler);
    },
    () => {
      ensureStudioSnapshotsReady();
      return getStudiosSnapshot();
    },
    () => [],
  );
}

export function useActiveStudios(): StudioRoom[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureStudioSnapshotsReady();

      const handler = () => {
        initializeStudioSnapshots();
        onStoreChange();
      };

      window.addEventListener(STUDIOS_UPDATED_EVENT, handler);
      return () => window.removeEventListener(STUDIOS_UPDATED_EVENT, handler);
    },
    () => {
      ensureStudioSnapshotsReady();
      return getActiveStudiosSnapshot();
    },
    () => [],
  );
}

export function refreshStudiosSnapshot(): StudioRoom[] {
  initializeStudioSnapshots();
  return loadAllStudios();
}
