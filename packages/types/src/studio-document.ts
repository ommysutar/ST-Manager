export type StudioDocumentType = "quotation" | "invoice" | "receipt";

export interface StudioDocument {
  id: string;
  studioId: string;
  type: StudioDocumentType;
  documentNumber: string;
  inquiryId: string | null;
  projectId: string | null;
  paymentId: string | null;
  snapshot: unknown | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
