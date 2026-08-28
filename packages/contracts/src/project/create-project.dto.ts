import type { ProjectPayload, ProjectSource } from "@st-manager/types";

export interface CreateProjectDto {
  source: ProjectSource;
  inquiryId?: string | null;
  clientId?: string | null;
  projectName: string;
  clientName: string;
  clientMobile?: string | null;
  clientEmail?: string | null;
  projectCategory?: string | null;
  status?: string;
  assignedEngineer?: string;
  planId?: string | null;
  advanceReceived?: number;
  remainingBalance?: number;
  grandTotal?: number;
  notes?: string | null;
  selectedServiceIds?: string[];
  quotation?: ProjectPayload["quotation"];
  tasks?: unknown[];
  files?: unknown[];
  links?: unknown[];
  expenses?: unknown[];
  sessionIds?: string[];
  bookingIds?: string[];
  invoiceIds?: string[];
}
