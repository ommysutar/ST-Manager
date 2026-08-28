import type { CreateInquiryDto } from "./create-inquiry.dto";

export interface UpdateInquiryDto {
  status?: string;
  projectId?: string | null;
  advanceAmount?: number | null;
  remainingBalance?: number | null;
  form?: unknown;
  quotation?: unknown;
}
