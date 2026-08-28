import type { StudioDocumentType } from "@st-manager/types";

export interface CreateStudioDocumentDto {
  type: StudioDocumentType;
  inquiryId?: string | null;
  projectId?: string | null;
  paymentId?: string | null;
  snapshot?: unknown;
}
