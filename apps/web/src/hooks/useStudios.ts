"use client";

import { useSyncExternalStore } from "react";

import { EMPTY_STUDIOS } from "@/hooks/empty-server-snapshots";
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

function subscribeToStudios(onStoreChange: () => void): () => void {
  ensureStudioSnapshotsReady();

  const handler = () => {
    initializeStudioSnapshots();
    onStoreChange();
  };

  window.addEventListener(STUDIOS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(STUDIOS_UPDATED_EVENT, handler);
}

/** Stable getSnapshot for useSyncExternalStore — returns cached module snapshot only. */
function readStudiosSnapshot(): StudioRoom[] {
  ensureStudioSnapshotsReady();
  return getStudiosSnapshot();
}

/** Stable getSnapshot for useSyncExternalStore — returns cached active subset only. */
function readActiveStudiosSnapshot(): StudioRoom[] {
  ensureStudioSnapshotsReady();
  return getActiveStudiosSnapshot();
}

export function useStudios(): StudioRoom[] {
  return useSyncExternalStore(subscribeToStudios, readStudiosSnapshot, () => EMPTY_STUDIOS);
}

export function useActiveStudios(): StudioRoom[] {
  return useSyncExternalStore(subscribeToStudios, readActiveStudiosSnapshot, () => EMPTY_STUDIOS);
}

export function refreshStudiosSnapshot(): StudioRoom[] {
  initializeStudioSnapshots();
  return loadAllStudios();
}
