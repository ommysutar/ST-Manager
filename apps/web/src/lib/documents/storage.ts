import { generateId } from "@/lib/inquiry/services";

import { notifyDocumentsUpdated } from "./events";
import { getDocumentsSnapshot, setDocumentsSnapshot } from "./snapshots";
import type { DocumentType, StudioDocument } from "./types";
import { DOCUMENTS_STORAGE_KEY } from "./types";

function normalizeDocument(raw: Partial<StudioDocument> & { id: string }): StudioDocument {
  return {
    id: raw.id,
    type: raw.type === "invoice" ? "invoice" : "quotation",
    documentNumber: raw.documentNumber ?? "",
    inquiryId: raw.inquiryId || undefined,
    projectId: raw.projectId || undefined,
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

export function loadAllDocuments(): StudioDocument[] {
  return readDocumentsFromStorage();
}

export function listDocuments(): StudioDocument[] {
  return loadAllDocuments();
}

export function getDocument(id: string): StudioDocument | undefined {
  return loadAllDocuments().find((document) => document.id === id);
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

function nextDocumentNumber(type: DocumentType, documents: StudioDocument[]): string {
  const prefix = type === "invoice" ? "INV" : "QTN";
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
    return existing;
  }

  const documents = loadAllDocuments();
  const document = normalizeDocument({
    id: generateId("doc"),
    type: "quotation",
    documentNumber: nextDocumentNumber("quotation", documents),
    inquiryId: input.inquiryId,
    projectId: input.projectId,
    createdAt: new Date().toISOString(),
  });

  persistDocuments([document, ...documents]);
  return document;
}

/** Idempotent — returns the existing invoice for this project if one was already generated. */
export function getOrCreateInvoice(projectId: string): StudioDocument {
  const existing = loadAllDocuments().find(
    (document) => document.type === "invoice" && document.projectId === projectId,
  );
  if (existing) {
    return existing;
  }

  const documents = loadAllDocuments();
  const document = normalizeDocument({
    id: generateId("doc"),
    type: "invoice",
    documentNumber: nextDocumentNumber("invoice", documents),
    projectId,
    createdAt: new Date().toISOString(),
  });

  persistDocuments([document, ...documents]);
  return document;
}

/** Called when an inquiry converts to a project — backfills projectId on its quotation(s). */
export function linkDocumentsToProject(inquiryId: string, projectId: string): void {
  const documents = loadAllDocuments();
  let changed = false;

  const next = documents.map((document) => {
    if (document.inquiryId === inquiryId && !document.projectId) {
      changed = true;
      return { ...document, projectId };
    }
    return document;
  });

  if (changed) {
    persistDocuments(next);
  }
}

export function initializeDocumentSnapshots(): void {
  setDocumentsSnapshot(loadAllDocuments());
}

export { getDocumentsSnapshot };
