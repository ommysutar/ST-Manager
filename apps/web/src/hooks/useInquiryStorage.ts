"use client";

import { useSyncExternalStore } from "react";

import { EMPTY_INQUIRIES, EMPTY_STUDIO_SERVICES } from "@/hooks/empty-server-snapshots";
import {
  INQUIRIES_UPDATED_EVENT,
  SERVICE_PRICING_UPDATED_EVENT,
} from "@/lib/inquiry/events";
import { initializeServiceSnapshots } from "@/lib/inquiry/services";
import {
  getActiveServicesSnapshot,
  getAllServicesSnapshot,
  getInquiriesSnapshot,
  getInquirySnapshot,
} from "@/lib/inquiry/snapshots";
import { initializeInquirySnapshots } from "@/lib/inquiry/storage";
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

export function useInquiries(): SavedInquiry[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureSnapshotsReady();

      const handler = () => {
        initializeInquirySnapshots();
        onStoreChange();
      };

      window.addEventListener(INQUIRIES_UPDATED_EVENT, handler);
      return () => window.removeEventListener(INQUIRIES_UPDATED_EVENT, handler);
    },
    () => {
      ensureSnapshotsReady();
      return getInquiriesSnapshot();
    },
    () => EMPTY_INQUIRIES,
  );
}

export function useInquiry(inquiryId: string): SavedInquiry | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureSnapshotsReady();

      const handler = () => {
        initializeInquirySnapshots();
        onStoreChange();
      };

      window.addEventListener(INQUIRIES_UPDATED_EVENT, handler);
      return () => window.removeEventListener(INQUIRIES_UPDATED_EVENT, handler);
    },
    () => {
      ensureSnapshotsReady();
      return getInquirySnapshot(inquiryId);
    },
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
