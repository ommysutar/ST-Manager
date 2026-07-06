"use client";

import { useSyncExternalStore } from "react";

import { DOCUMENTS_UPDATED_EVENT } from "@/lib/documents/events";
import { getDocumentsSnapshot, initializeDocumentSnapshots } from "@/lib/documents/storage";
import type { StudioDocument } from "@/lib/documents/types";

let snapshotsReady = false;

function ensureDocumentSnapshotsReady(): void {
  if (typeof window === "undefined" || snapshotsReady) {
    return;
  }

  initializeDocumentSnapshots();
  snapshotsReady = true;
}

export function useDocuments(): StudioDocument[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      ensureDocumentSnapshotsReady();

      const handler = () => {
        initializeDocumentSnapshots();
        onStoreChange();
      };

      window.addEventListener(DOCUMENTS_UPDATED_EVENT, handler);
      return () => window.removeEventListener(DOCUMENTS_UPDATED_EVENT, handler);
    },
    () => {
      ensureDocumentSnapshotsReady();
      return getDocumentsSnapshot();
    },
    () => [],
  );
}

export function useDocumentsForProject(projectId: string): StudioDocument[] {
  const documents = useDocuments();
  return documents.filter((document) => document.projectId === projectId);
}
