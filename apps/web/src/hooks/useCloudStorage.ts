"use client";

import { useSyncExternalStore } from "react";

import { CLOUD_STORAGE_UPDATED_EVENT } from "@/lib/cloud-storage/events";
import { getCloudStorageSnapshot } from "@/lib/cloud-storage/snapshots";
import {
  initializeCloudStorageSnapshots,
  loadCloudStorageSettings,
} from "@/lib/cloud-storage/storage";
import type { CloudStorageSettings } from "@/lib/cloud-storage/types";

let snapshotsReady = false;

function ensureCloudSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializeCloudStorageSnapshots();
  snapshotsReady = true;
}

export function useCloudStorageSettings(): CloudStorageSettings {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureCloudSnapshotsReady();

      const handler = () => {
        initializeCloudStorageSnapshots();
        onStoreChange();
      };

      window.addEventListener(CLOUD_STORAGE_UPDATED_EVENT, handler);
      return () => window.removeEventListener(CLOUD_STORAGE_UPDATED_EVENT, handler);
    },
    () => {
      ensureCloudSnapshotsReady();
      return getCloudStorageSnapshot();
    },
    () => loadCloudStorageSettings(),
  );
}
