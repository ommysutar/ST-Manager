export interface Inquiry {
  id: string;
  studioId: string;
  /** Stable studio-scoped display id such as INQ-0001. */
  inquiryNumber: string;
  status: string;
  projectId: string | null;
  advanceAmount: number | null;
  remainingBalance: number | null;
  form: unknown;
  quotation: unknown;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
