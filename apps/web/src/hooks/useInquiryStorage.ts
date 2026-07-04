"use client";

import { useSyncExternalStore } from "react";

import { DEFAULT_PROJECT_PLANS, DEFAULT_STUDIO_SERVICES } from "@/lib/inquiry/constants";
import {
  INQUIRIES_UPDATED_EVENT,
  PROJECT_PLANS_UPDATED_EVENT,
  PROJECTS_UPDATED_EVENT,
  SERVICE_PRICING_UPDATED_EVENT,
} from "@/lib/inquiry/events";
import { initializeProjectPlanSnapshots } from "@/lib/inquiry/plans";
import { initializeServiceSnapshots } from "@/lib/inquiry/services";
import {
  getActivePlansSnapshot,
  getActiveServicesSnapshot,
  getAllPlansSnapshot,
  getAllServicesSnapshot,
  getInquiriesSnapshot,
  getInquirySnapshot,
} from "@/lib/inquiry/snapshots";
import { getProject, initializeInquirySnapshots } from "@/lib/inquiry/storage";
import type { CreatedProject, ProjectPlan, SavedInquiry, StudioService } from "@/lib/inquiry/types";

const defaultActiveServices = DEFAULT_STUDIO_SERVICES.filter((service) => service.active);
const defaultActivePlans = DEFAULT_PROJECT_PLANS.filter((plan) => plan.active);

let snapshotsReady = false;

function ensureSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializeInquirySnapshots();
  initializeServiceSnapshots();
  initializeProjectPlanSnapshots();
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
    () => [],
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

export function useProject(projectId: string): CreatedProject | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(PROJECTS_UPDATED_EVENT, onStoreChange);
      return () => window.removeEventListener(PROJECTS_UPDATED_EVENT, onStoreChange);
    },
    () => getProject(projectId) ?? null,
    () => null,
  );
}

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
    () => DEFAULT_STUDIO_SERVICES,
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
    () => defaultActiveServices,
  );
}

/** All project plans for Owner/Admin management (includes inactive). */
export function useAllProjectPlans(): ProjectPlan[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureSnapshotsReady();

      const handler = () => {
        initializeProjectPlanSnapshots();
        onStoreChange();
      };

      window.addEventListener(PROJECT_PLANS_UPDATED_EVENT, handler);
      return () => window.removeEventListener(PROJECT_PLANS_UPDATED_EVENT, handler);
    },
    () => {
      ensureSnapshotsReady();
      return getAllPlansSnapshot();
    },
    () => DEFAULT_PROJECT_PLANS,
  );
}

/** Active project plans only — used by the New Inquiry Wizard. */
export function useProjectPlans(): ProjectPlan[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureSnapshotsReady();

      const handler = () => {
        initializeProjectPlanSnapshots();
        onStoreChange();
      };

      window.addEventListener(PROJECT_PLANS_UPDATED_EVENT, handler);
      return () => window.removeEventListener(PROJECT_PLANS_UPDATED_EVENT, handler);
    },
    () => {
      ensureSnapshotsReady();
      return getActivePlansSnapshot();
    },
    () => defaultActivePlans,
  );
}

export function useIsClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
