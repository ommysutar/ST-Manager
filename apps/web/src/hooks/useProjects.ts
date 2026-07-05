"use client";

import { useSyncExternalStore } from "react";

import { PROJECTS_UPDATED_EVENT } from "@/lib/inquiry/events";
import {
  getProject as getProjectById,
  getProjectsSnapshot,
  initializeProjectSnapshots,
  listProjects,
} from "@/lib/projects/storage";
import type { StudioProject } from "@/lib/projects/types";

let snapshotsReady = false;

function ensureProjectSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializeProjectSnapshots();
  snapshotsReady = true;
}

export function useProjects(): StudioProject[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureProjectSnapshotsReady();

      const handler = () => {
        initializeProjectSnapshots();
        onStoreChange();
      };

      window.addEventListener(PROJECTS_UPDATED_EVENT, handler);
      return () => window.removeEventListener(PROJECTS_UPDATED_EVENT, handler);
    },
    () => {
      ensureProjectSnapshotsReady();
      return getProjectsSnapshot();
    },
    () => [],
  );
}

export function useProject(projectId: string): StudioProject | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureProjectSnapshotsReady();

      const handler = () => {
        initializeProjectSnapshots();
        onStoreChange();
      };

      window.addEventListener(PROJECTS_UPDATED_EVENT, handler);
      return () => window.removeEventListener(PROJECTS_UPDATED_EVENT, handler);
    },
    () => {
      ensureProjectSnapshotsReady();
      return getProjectsSnapshot().find((project) => project.id === projectId) ?? getProjectById(projectId) ?? null;
    },
    () => null,
  );
}

/** Imperative refresh helper for non-hook contexts. */
export function refreshProjectsSnapshot(): StudioProject[] {
  initializeProjectSnapshots();
  return listProjects();
}
