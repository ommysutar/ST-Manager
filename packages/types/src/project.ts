export type ProjectSource = "inquiry" | "manual";

export interface ProjectPayload {
  selectedServiceIds: string[];
  quotation?: unknown;
  tasks: unknown[];
  files: unknown[];
  links: unknown[];
  expenses: unknown[];
  sessionIds: string[];
  bookingIds: string[];
  invoiceIds: string[];
}

export interface Project {
  id: string;
  studioId: string;
  /** Stable studio-scoped display id such as PRJ-0001. */
  projectNumber: string;
  source: ProjectSource;
  inquiryId: string | null;
  clientId: string | null;
  projectName: string;
  clientName: string;
  clientMobile: string | null;
  clientEmail: string | null;
  projectCategory: string | null;
  status: string;
  assignedEngineer: string;
  planId: string | null;
  advanceReceived: number;
  remainingBalance: number;
  grandTotal: number;
  notes: string | null;
  payload: ProjectPayload;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
