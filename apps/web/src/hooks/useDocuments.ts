"use client";

import { useSyncExternalStore } from "react";

import { EMPTY_DOCUMENTS } from "@/hooks/empty-server-snapshots";
import { DOCUMENTS_UPDATED_EVENT } from "@/lib/documents/events";
import { requestDocumentApiReconcile } from "@/lib/documents/reconcile";
import { hydrateDocumentsSnapshotFromCache } from "@/lib/documents/store";
import { getDocumentsSnapshot, initializeDocumentSnapshots, listDocuments } from "@/lib/documents/storage";
import type { StudioDocument } from "@/lib/documents/types";

let snapshotsReady = false;
let reconcileStarted = false;

function ensureDocumentSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializeDocumentSnapshots();
  snapshotsReady = true;
}

function ensureDocumentReconcile(): void {
  if (typeof window === "undefined" || reconcileStarted) {
    return;
  }
  reconcileStarted = true;
  void requestDocumentApiReconcile();
}

export function useDocuments(): StudioDocument[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureDocumentSnapshotsReady();
      ensureDocumentReconcile();

      const handler = () => {
        hydrateDocumentsSnapshotFromCache();
        onStoreChange();
      };

      window.addEventListener(DOCUMENTS_UPDATED_EVENT, handler);
      window.addEventListener("st-manager-projects-updated", handler);
      window.addEventListener("st-manager-payments-updated", handler);
      return () => {
        window.removeEventListener(DOCUMENTS_UPDATED_EVENT, handler);
        window.removeEventListener("st-manager-projects-updated", handler);
        window.removeEventListener("st-manager-payments-updated", handler);
      };
    },
    () => {
      ensureDocumentSnapshotsReady();
      return getDocumentsSnapshot();
    },
    () => EMPTY_DOCUMENTS,
  );
}

export function useDocumentsForProject(projectId: string): StudioDocument[] {
  const documents = useDocuments();
  return documents.filter((document) => document.projectId === projectId);
}

export function refreshDocumentsSnapshot(): StudioDocument[] {
  hydrateDocumentsSnapshotFromCache();
  return listDocuments();
}
