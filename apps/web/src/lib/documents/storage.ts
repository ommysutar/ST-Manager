import { getProject } from "@/lib/projects/storage";
import { getActiveStudioId, isBrowserOnline } from "@/lib/sync";

import { notifyDocumentsUpdated } from "./events";
import { buildDocumentSnapshot, mergeProjectIntoSnapshot } from "./snapshot";
import { getDocumentsSnapshot } from "./snapshots";
import {
  buildOptimisticStudioDocument,
  createLocalDocumentId,
  enqueuePendingDocumentCreate,
  flushPendingDocumentCreates,
  getDocumentsStoreSnapshot,
  hydrateDocumentsSnapshotFromCache,
  isLocalDocumentId,
  listPendingDocumentCreates,
  updatePendingDocumentCreate,
  upsertDocumentInSnapshot,
} from "./store";
import type { DocumentType, StudioDocument } from "./types";

function ensureDocumentsHydrated(): StudioDocument[] {
  if (getDocumentsStoreSnapshot().length === 0) {
    hydrateDocumentsSnapshotFromCache();
  }
  return getDocumentsStoreSnapshot();
}

function ensureSnapshot(document: StudioDocument): StudioDocument {
  if (document.snapshot) {
    return document;
  }

  const snapshot = buildDocumentSnapshot({
    projectId: document.projectId,
    inquiryId: document.inquiryId,
    paymentId: document.paymentId,
  });

  if (!snapshot) {
    return document;
  }

  const updated = { ...document, snapshot };
  upsertDocumentInSnapshot(updated);
  notifyDocumentsUpdated();
  return updated;
}

function withSnapshot(document: StudioDocument): StudioDocument {
  const snapshot =
    buildDocumentSnapshot({
      projectId: document.projectId,
      inquiryId: document.inquiryId,
      paymentId: document.paymentId,
    }) ?? document.snapshot;

  if (!snapshot) {
    return document;
  }

  return { ...document, snapshot };
}

function findExistingQuotation(input: {
  inquiryId?: string;
  projectId?: string;
}): StudioDocument | undefined {
  return ensureDocumentsHydrated().find(
    (document) =>
      document.type === "quotation" &&
      ((input.inquiryId && document.inquiryId === input.inquiryId) ||
        (input.projectId && document.projectId === input.projectId)),
  );
}

function findExistingInvoice(projectId: string): StudioDocument | undefined {
  return ensureDocumentsHydrated().find(
    (document) => document.type === "invoice" && document.projectId === projectId,
  );
}

function findExistingReceipt(paymentId: string): StudioDocument | undefined {
  return ensureDocumentsHydrated().find(
    (document) => document.type === "receipt" && document.paymentId === paymentId,
  );
}

function createDocumentSync(payload: {
  type: DocumentType;
  inquiryId?: string;
  projectId?: string;
  paymentId?: string;
}): StudioDocument {
  const studioId = getActiveStudioId();
  if (!studioId) {
    throw new Error("Studio context required");
  }

  const snapshot = buildDocumentSnapshot({
    projectId: payload.projectId,
    inquiryId: payload.inquiryId,
    paymentId: payload.paymentId,
  });

  const createPayload = {
    type: payload.type,
    inquiryId: payload.inquiryId ?? null,
    projectId: payload.projectId ?? null,
    paymentId: payload.paymentId ?? null,
    snapshot: snapshot ?? null,
  };

  const localId = createLocalDocumentId();
  const optimistic = withSnapshot(buildOptimisticStudioDocument(localId, createPayload));
  enqueuePendingDocumentCreate({
    localId,
    studioId,
    payload: createPayload,
    enqueuedAt: new Date().toISOString(),
  });
  upsertDocumentInSnapshot(optimistic);
  notifyDocumentsUpdated();

  if (isBrowserOnline()) {
    void flushPendingDocumentCreates();
  }

  return ensureSnapshot(optimistic);
}

export function loadAllDocuments(): StudioDocument[] {
  return ensureDocumentsHydrated();
}

export function listDocuments(): StudioDocument[] {
  return loadAllDocuments();
}

export function getDocument(id: string): StudioDocument | undefined {
  const document = loadAllDocuments().find((entry) => entry.id === id);
  return document ? ensureSnapshot(document) : undefined;
}

export function listDocumentsForProject(projectId: string): StudioDocument[] {
  return loadAllDocuments().filter((document) => document.projectId === projectId);
}

export function listDocumentsForInquiry(inquiryId: string): StudioDocument[] {
  return loadAllDocuments().filter((document) => document.inquiryId === inquiryId);
}

/** Idempotent — returns the existing quotation for this inquiry/project if one was already generated. */
export function getOrCreateQuotation(input: { inquiryId?: string; projectId?: string }): StudioDocument {
  const existing = findExistingQuotation(input);
  if (existing) {
    return ensureSnapshot(existing);
  }

  return createDocumentSync({
    type: "quotation",
    inquiryId: input.inquiryId,
    projectId: input.projectId,
  });
}

/** Idempotent — returns the existing invoice for this project if one was already generated. */
export function getOrCreateInvoice(projectId: string): StudioDocument {
  const existing = findExistingInvoice(projectId);
  if (existing) {
    return ensureSnapshot(existing);
  }

  return createDocumentSync({
    type: "invoice",
    projectId,
  });
}

/** Idempotent — returns the existing receipt for this payment if one was already generated. */
export function getOrCreateReceipt(projectId: string, paymentId: string): StudioDocument {
  const existing = findExistingReceipt(paymentId);
  if (existing) {
    return ensureSnapshot(existing);
  }

  return createDocumentSync({
    type: "receipt",
    projectId,
    paymentId,
  });
}

/** Called when an inquiry converts to a project — backfills projectId on its quotation(s). */
export function linkDocumentsToProject(inquiryId: string, projectId: string): void {
  const project = getProject(projectId);
  const documents = loadAllDocuments();
  let changed = false;

  const next = documents.map((document) => {
    if (document.inquiryId !== inquiryId || document.projectId) {
      return document;
    }

    changed = true;
    const updated: StudioDocument = { ...document, projectId };
    if (project && updated.snapshot) {
      updated.snapshot = mergeProjectIntoSnapshot(updated.snapshot, project);
    }
    return updated;
  });

  if (changed) {
    for (const document of next) {
      if (document.inquiryId === inquiryId && document.projectId === projectId) {
        upsertDocumentInSnapshot(document);
      }
    }

    for (const pending of listPendingDocumentCreates()) {
      if (pending.payload.inquiryId === inquiryId && !pending.payload.projectId) {
        updatePendingDocumentCreate(pending.localId, {
          payload: { ...pending.payload, projectId },
        });
      }
    }

    notifyDocumentsUpdated();

    if (isBrowserOnline()) {
      void flushPendingDocumentCreates();
    }
  }
}

export function initializeDocumentSnapshots(): void {
  hydrateDocumentsSnapshotFromCache();
}

export { getDocumentsSnapshot, flushPendingDocumentCreates, isLocalDocumentId };
