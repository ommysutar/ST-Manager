import { generateId } from "@/lib/inquiry/services";
import { getProject } from "@/lib/projects/storage";

import { buildDocumentSnapshot, mergeProjectIntoSnapshot } from "./snapshot";
import { notifyDocumentsUpdated } from "./events";
import { getDocumentsSnapshot, setDocumentsSnapshot } from "./snapshots";
import type { DocumentSnapshot, DocumentType, StudioDocument } from "./types";
import { DOCUMENTS_STORAGE_KEY } from "./types";

function normalizeSnapshot(raw: unknown): DocumentSnapshot | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const snapshot = raw as Partial<DocumentSnapshot>;
  if (!snapshot.clientName || !snapshot.projectName || !snapshot.projectNumber) {
    return undefined;
  }

  return {
    clientId: snapshot.clientId ?? "",
    clientDisplayNumber: snapshot.clientDisplayNumber ?? "",
    clientName: snapshot.clientName,
    clientMobile: snapshot.clientMobile ?? "",
    clientEmail: snapshot.clientEmail ?? "",
    clientAddress: snapshot.clientAddress ?? "",
    projectId: snapshot.projectId ?? "",
    projectNumber: snapshot.projectNumber,
    projectName: snapshot.projectName,
    projectCategory: snapshot.projectCategory ?? "",
    lineItems: Array.isArray(snapshot.lineItems) ? snapshot.lineItems : [],
    subtotal: Number(snapshot.subtotal ?? 0),
    discountAmount: Number(snapshot.discountAmount ?? 0),
    grandTotal: Number(snapshot.grandTotal ?? 0),
    paymentId: snapshot.paymentId,
    paymentAmount: snapshot.paymentAmount,
    paymentMethod: snapshot.paymentMethod,
    paymentDate: snapshot.paymentDate,
    paymentNotes: snapshot.paymentNotes,
    paymentReceivedBy: snapshot.paymentReceivedBy,
    capturedAt: snapshot.capturedAt ?? new Date().toISOString(),
  };
}

function normalizeDocument(raw: Partial<StudioDocument> & { id: string }): StudioDocument {
  const type: DocumentType =
    raw.type === "invoice" ? "invoice" : raw.type === "receipt" ? "receipt" : "quotation";

  return {
    id: raw.id,
    type,
    documentNumber: raw.documentNumber ?? "",
    inquiryId: raw.inquiryId || undefined,
    projectId: raw.projectId || undefined,
    paymentId: raw.paymentId || undefined,
    snapshot: normalizeSnapshot(raw.snapshot),
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

function readDocumentsFromStorage(): StudioDocument[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<StudioDocument>[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((entry) => normalizeDocument(entry as StudioDocument));
  } catch {
    return [];
  }
}

function persistDocuments(documents: StudioDocument[]): StudioDocument[] {
  const sorted = [...documents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(sorted));
  setDocumentsSnapshot(sorted);
  notifyDocumentsUpdated();
  return sorted;
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
  const documents = loadAllDocuments();
  const index = documents.findIndex((entry) => entry.id === document.id);
  if (index !== -1) {
    documents[index] = updated;
    persistDocuments(documents);
  }

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

export function loadAllDocuments(): StudioDocument[] {
  return readDocumentsFromStorage();
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

function parseDocumentNumber(prefix: string, value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const match = value.match(new RegExp(`^${prefix}-(\\d+)$`));
  return match ? Number.parseInt(match[1], 10) : 0;
}

function documentPrefix(type: DocumentType): string {
  if (type === "invoice") {
    return "INV";
  }
  if (type === "receipt") {
    return "RCP";
  }
  return "QTN";
}

function nextDocumentNumber(type: DocumentType, documents: StudioDocument[]): string {
  const prefix = documentPrefix(type);
  const max = documents
    .filter((document) => document.type === type)
    .reduce((acc, document) => Math.max(acc, parseDocumentNumber(prefix, document.documentNumber)), 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

/** Idempotent — returns the existing quotation for this inquiry/project if one was already generated. */
export function getOrCreateQuotation(input: { inquiryId?: string; projectId?: string }): StudioDocument {
  const existing = loadAllDocuments().find(
    (document) =>
      document.type === "quotation" &&
      ((input.inquiryId && document.inquiryId === input.inquiryId) ||
        (input.projectId && document.projectId === input.projectId)),
  );
  if (existing) {
    return ensureSnapshot(existing);
  }

  const documents = loadAllDocuments();
  const document = withSnapshot(
    normalizeDocument({
      id: generateId("doc"),
      type: "quotation",
      documentNumber: nextDocumentNumber("quotation", documents),
      inquiryId: input.inquiryId,
      projectId: input.projectId,
      createdAt: new Date().toISOString(),
    }),
  );

  persistDocuments([document, ...documents]);
  return document;
}

/** Idempotent — returns the existing invoice for this project if one was already generated. */
export function getOrCreateInvoice(projectId: string): StudioDocument {
  const existing = loadAllDocuments().find(
    (document) => document.type === "invoice" && document.projectId === projectId,
  );
  if (existing) {
    return ensureSnapshot(existing);
  }

  const documents = loadAllDocuments();
  const document = withSnapshot(
    normalizeDocument({
      id: generateId("doc"),
      type: "invoice",
      documentNumber: nextDocumentNumber("invoice", documents),
      projectId,
      createdAt: new Date().toISOString(),
    }),
  );

  persistDocuments([document, ...documents]);
  return document;
}

/** Idempotent — returns the existing receipt for this payment if one was already generated. */
export function getOrCreateReceipt(projectId: string, paymentId: string): StudioDocument {
  const existing = loadAllDocuments().find(
    (document) => document.type === "receipt" && document.paymentId === paymentId,
  );
  if (existing) {
    return ensureSnapshot(existing);
  }

  const documents = loadAllDocuments();
  const document = withSnapshot(
    normalizeDocument({
      id: generateId("doc"),
      type: "receipt",
      documentNumber: nextDocumentNumber("receipt", documents),
      projectId,
      paymentId,
      createdAt: new Date().toISOString(),
    }),
  );

  persistDocuments([document, ...documents]);
  return document;
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
    persistDocuments(next);
  }
}

export function initializeDocumentSnapshots(): void {
  setDocumentsSnapshot(loadAllDocuments());
}

export { getDocumentsSnapshot };
