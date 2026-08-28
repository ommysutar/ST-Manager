"use client";

import { useSyncExternalStore } from "react";

import { EMPTY_INQUIRIES, EMPTY_STUDIO_SERVICES } from "@/hooks/empty-server-snapshots";
import {
  INQUIRIES_UPDATED_EVENT,
  SERVICE_PRICING_UPDATED_EVENT,
} from "@/lib/inquiry/events";
import { requestInquiryApiReconcile } from "@/lib/inquiry/reconcile";
import { initializeServiceSnapshots } from "@/lib/inquiry/services";
import {
  getActiveServicesSnapshot,
  getAllServicesSnapshot,
  getInquiriesSnapshot,
  getInquirySnapshot,
} from "@/lib/inquiry/snapshots";
import { initializeInquirySnapshots } from "@/lib/inquiry/storage";
import { getInquiryFromSnapshot, hydrateInquiriesSnapshotFromCache } from "@/lib/inquiry/store";
import { initializeProjectSnapshots } from "@/lib/projects/storage";
import type { SavedInquiry, StudioService } from "@/lib/inquiry/types";

let snapshotsReady = false;

function ensureSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializeInquirySnapshots();
  initializeServiceSnapshots();
  initializeProjectSnapshots();
  snapshotsReady = true;
}

function subscribeToInquiries(onStoreChange: () => void): () => void {
  ensureSnapshotsReady();
  onStoreChange();

  void requestInquiryApiReconcile().finally(onStoreChange);

  const handler = () => {
    onStoreChange();
  };

  window.addEventListener(INQUIRIES_UPDATED_EVENT, handler);
  return () => window.removeEventListener(INQUIRIES_UPDATED_EVENT, handler);
}

function readInquiriesSnapshot(): SavedInquiry[] {
  ensureSnapshotsReady();
  return getInquiriesSnapshot();
}

export function useInquiries(): SavedInquiry[] {
  return useSyncExternalStore(
    subscribeToInquiries,
    readInquiriesSnapshot,
    () => EMPTY_INQUIRIES,
  );
}

function subscribeToInquiry(inquiryId: string, onStoreChange: () => void): () => void {
  ensureSnapshotsReady();
  onStoreChange();

  const handler = () => {
    onStoreChange();
  };

  window.addEventListener(INQUIRIES_UPDATED_EVENT, handler);
  return () => window.removeEventListener(INQUIRIES_UPDATED_EVENT, handler);
}

function readInquiryFromSnapshot(inquiryId: string): SavedInquiry | null {
  ensureSnapshotsReady();
  return getInquiryFromSnapshot(inquiryId) ?? getInquirySnapshot(inquiryId);
}

export function useInquiry(inquiryId: string): SavedInquiry | null {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToInquiry(inquiryId, onStoreChange),
    () => readInquiryFromSnapshot(inquiryId),
    () => null,
  );
}

/** @deprecated Use useProject from @/hooks/useProjects */
export { useProject } from "@/hooks/useProjects";

/** All services for Owner/Admin management (includes inactive). */
export function useAllStudioServices(): StudioService[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureSnapshotsReady();

      const handler = () => {
        initializeServiceSnapshots();
        onStoreChange();
      };

      window.addEventListener(SERVICE_PRICING_UPDATED_EVENT, handler);
      return () => window.removeEventListener(SERVICE_PRICING_UPDATED_EVENT, handler);
    },
    () => {
      ensureSnapshotsReady();
      return getAllServicesSnapshot();
    },
    () => EMPTY_STUDIO_SERVICES,
  );
}

/** Active services only — used by the New Inquiry Wizard. */
export function useStudioServices(): StudioService[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureSnapshotsReady();

      const handler = () => {
        initializeServiceSnapshots();
        onStoreChange();
      };

      window.addEventListener(SERVICE_PRICING_UPDATED_EVENT, handler);
      return () => window.removeEventListener(SERVICE_PRICING_UPDATED_EVENT, handler);
    },
    () => {
      ensureSnapshotsReady();
      return getActiveServicesSnapshot();
    },
    () => EMPTY_STUDIO_SERVICES,
  );
}

export function useIsClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export { hydrateInquiriesSnapshotFromCache };
