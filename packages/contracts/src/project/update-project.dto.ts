import type { CreateProjectDto } from "./create-project.dto";

export interface UpdateProjectDto {
  source?: CreateProjectDto["source"];
  inquiryId?: string | null;
  clientId?: string | null;
  projectName?: string;
  clientName?: string;
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
  quotation?: CreateProjectDto["quotation"];
  tasks?: unknown[];
  files?: unknown[];
  links?: unknown[];
  expenses?: unknown[];
  sessionIds?: string[];
  bookingIds?: string[];
  invoiceIds?: string[];
}
