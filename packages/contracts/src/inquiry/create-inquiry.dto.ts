export interface CreateInquiryDto {
  status?: string;
  projectId?: string | null;
  advanceAmount?: number | null;
  remainingBalance?: number | null;
  form: unknown;
  quotation: unknown;
}
