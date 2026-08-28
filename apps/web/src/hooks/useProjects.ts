"use client";

import { useSyncExternalStore } from "react";

import { EMPTY_PROJECTS } from "@/hooks/empty-server-snapshots";
import { PROJECTS_UPDATED_EVENT } from "@/lib/inquiry/events";
import { requestProjectApiReconcile } from "@/lib/projects/reconcile";
import {
  getProjectFromSnapshot,
  getProjectsSnapshot,
  hydrateProjectsSnapshotFromCache,
} from "@/lib/projects/store";
import type { StudioProject } from "@/lib/projects/types";

let snapshotInitialized = false;

function ensureProjectsSnapshotLoaded(): void {
  if (typeof window === "undefined" || snapshotInitialized) {
    return;
  }

  snapshotInitialized = true;
  hydrateProjectsSnapshotFromCache();
}

function getServerProjectsSnapshot(): StudioProject[] {
  return EMPTY_PROJECTS;
}

/**
 * Subscribe to the in-memory project snapshot.
 * Reconcile runs in the background; UI updates from cache + PROJECTS_UPDATED_EVENT
 * without requiring a full-page reload or blocking on a full list refresh.
 */
function subscribeToProjects(onStoreChange: () => void): () => void {
  ensureProjectsSnapshotLoaded();
  onStoreChange();

  void requestProjectApiReconcile().finally(onStoreChange);

  const handler = () => {
    onStoreChange();
  };

  window.addEventListener(PROJECTS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(PROJECTS_UPDATED_EVENT, handler);
}

function readProjectsSnapshot(): StudioProject[] {
  ensureProjectsSnapshotLoaded();
  return getProjectsSnapshot();
}

export function useProjects(): StudioProject[] {
  return useSyncExternalStore(
    subscribeToProjects,
    readProjectsSnapshot,
    getServerProjectsSnapshot,
  );
}

function subscribeToProject(projectId: string, onStoreChange: () => void): () => void {
  ensureProjectsSnapshotLoaded();
  onStoreChange();

  const handler = () => {
    onStoreChange();
  };

  window.addEventListener(PROJECTS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(PROJECTS_UPDATED_EVENT, handler);
}

function readProjectFromSnapshot(projectId: string): StudioProject | null {
  ensureProjectsSnapshotLoaded();
  return getProjectFromSnapshot(projectId) ?? null;
}

/** Subscribe to one project from the in-memory snapshot (cache + offline queue). */
export function useProject(projectId: string): StudioProject | null {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToProject(projectId, onStoreChange),
    () => readProjectFromSnapshot(projectId),
    () => null,
  );
}

/** Imperative refresh helper for non-hook contexts. */
export async function refreshProjectsSnapshot(): Promise<StudioProject[]> {
  const { refreshProjectsSnapshot: refreshFromStore } = await import("@/lib/projects/store");
  return refreshFromStore();
}
