export type DocumentType = "quotation" | "invoice";

/**
 * A StudioDocument is a thin, numbered pointer — not a data snapshot.
 * Line items and totals are always resolved live from the source Project/Inquiry
 * so edits (e.g. service price corrections) are reflected everywhere automatically.
 */
export interface StudioDocument {
  id: string;
  type: DocumentType;
  documentNumber: string;
  inquiryId?: string;
  projectId?: string;
  createdAt: string;
}

export const DOCUMENTS_STORAGE_KEY = "st-manager-documents";
