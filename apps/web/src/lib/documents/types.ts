export type DocumentType = "quotation" | "invoice" | "receipt";

export interface DocumentLineItemSnapshot {
  id: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
}

/** Frozen client/project/totals captured when a document is first generated. */
export interface DocumentSnapshot {
  clientId: string;
  clientDisplayNumber: string;
  clientName: string;
  clientMobile: string;
  clientEmail: string;
  clientAddress: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
  projectCategory: string;
  lineItems: DocumentLineItemSnapshot[];
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  paymentId?: string;
  paymentAmount?: number;
  paymentMethod?: string;
  paymentDate?: string;
  paymentNotes?: string;
  paymentReceivedBy?: string;
  capturedAt: string;
}

export interface StudioDocument {
  id: string;
  type: DocumentType;
  documentNumber: string;
  inquiryId?: string;
  projectId?: string;
  paymentId?: string;
  snapshot?: DocumentSnapshot;
  createdAt: string;
}

export const DOCUMENTS_STORAGE_KEY = "st-manager-documents";
