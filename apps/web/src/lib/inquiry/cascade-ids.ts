import { notifyDocumentsUpdated } from "@/lib/documents/events";
import { setDocumentsSnapshot } from "@/lib/documents/snapshots";
import { loadAllDocuments } from "@/lib/documents/storage";
import { DOCUMENTS_STORAGE_KEY } from "@/lib/documents/types";
import { notifyProjectsUpdated } from "@/lib/inquiry/events";
import {
  getProjectsSnapshot,
  hydrateProjectsSnapshotFromCache,
  upsertProjectInSnapshot,
} from "@/lib/projects/store";
import {
  listPendingProjectCreates,
  updatePendingProjectCreate,
} from "@/lib/projects/offline-queue";

/**
 * Rewrites persistent local references when an inquiry id changes
 * (legacy → server, or local_inq_* → server).
 */
export function cascadeInquiryIdRemap(oldInquiryId: string, newInquiryId: string): void {
  if (typeof window === "undefined" || oldInquiryId === newInquiryId) {
    return;
  }

  let projectsChanged = false;
  hydrateProjectsSnapshotFromCache();
  const nextProjects = getProjectsSnapshot().map((project) => {
    if (project.inquiryId !== oldInquiryId) {
      return project;
    }
    projectsChanged = true;
    return { ...project, inquiryId: newInquiryId, updatedAt: new Date().toISOString() };
  });
  if (projectsChanged) {
    for (const project of nextProjects) {
      upsertProjectInSnapshot(project);
    }
    notifyProjectsUpdated();
  }

  for (const pending of listPendingProjectCreates()) {
    if (pending.payload.inquiryId === oldInquiryId) {
      updatePendingProjectCreate(pending.localId, {
        payload: { ...pending.payload, inquiryId: newInquiryId },
      });
    }
  }

  let documentsChanged = false;
  const nextDocuments = loadAllDocuments().map((document) => {
    if (document.inquiryId !== oldInquiryId) {
      return document;
    }
    documentsChanged = true;
    return { ...document, inquiryId: newInquiryId, updatedAt: new Date().toISOString() };
  });
  if (documentsChanged) {
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(nextDocuments));
    setDocumentsSnapshot(nextDocuments);
    notifyDocumentsUpdated();
  }
}
