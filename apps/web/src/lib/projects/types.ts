import type { InquiryWizardFormValues, QuotationBreakdown } from "@/lib/inquiry/types";

export type ProjectStatus = "active" | "on_hold" | "delivered" | "completed" | "cancelled";
export type ProjectSource = "inquiry" | "manual";
export type TaskStatus = "pending" | "in_progress" | "completed";

/** Tasks that every project must have and can never be deleted (only reordered). */
export type MandatoryTaskKey = "payment" | "files_shared" | "project_delivery";

export type ProjectLinkProvider =
  | "google_drive"
  | "dropbox"
  | "onedrive"
  | "youtube"
  | "wetransfer"
  | "other";

/** Cloud storage providers supported for project file references. Files are never stored inside ST Manager. */
export type CloudProvider = "google_drive" | "dropbox" | "onedrive" | "other";

/** A pointer to a file hosted on external cloud storage — only metadata + link are persisted. */
export interface ProjectFile {
  id: string;
  name: string;
  type: string;
  size?: number;
  cloudUrl: string;
  provider: CloudProvider;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ProjectLink {
  id: string;
  label: string;
  url: string;
  provider: ProjectLinkProvider;
  createdAt: string;
}

/** Internal-only cost entry against a project. Never surfaced on client-facing documents. */
export interface ProjectExpense {
  id: string;
  name: string;
  category: string;
  amount: number;
  assignedPerson: string;
  notes: string;
  expenseDate: string;
  createdAt: string;
}

export interface ProjectProfit {
  revenue: number;
  totalExpenses: number;
  netProfit: number;
}

/** Central studio project entity — single source of truth for all workflows. */
export interface StudioProject {
  id: string;
  projectNumber: string;
  source: ProjectSource;
  inquiryId?: string;
  clientId?: string;
  projectName: string;
  clientName: string;
  clientMobile?: string;
  clientEmail?: string;
  projectCategory?: string;
  status: ProjectStatus;
  assignedEngineer: string;
  selectedServiceIds: string[];
  planId?: string;
  quotation?: QuotationBreakdown;
  advanceReceived: number;
  remainingBalance: number;
  grandTotal: number;
  tasks: ProjectTask[];
  files: ProjectFile[];
  links: ProjectLink[];
  expenses: ProjectExpense[];
  /** Future module links — prepared but not used in Phase 1 UI. */
  sessionIds: string[];
  bookingIds: string[];
  invoiceIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  name: string;
  serviceId?: string;
  isCustom: boolean;
  /** Set for the three system-required tasks (Payment, Files Shared, Project Delivery). */
  mandatoryKey?: MandatoryTaskKey;
  assignedEngineer: string;
  estimatedDurationMinutes: number;
  actualDurationMinutes?: number;
  notes: string;
  status: TaskStatus;
  completed: boolean;
  completedDate?: string;
  dueDate?: string;
  sortOrder: number;
}

export interface CreateProjectInput {
  source: ProjectSource;
  inquiryId?: string;
  clientId?: string;
  projectName: string;
  clientName: string;
  clientMobile?: string;
  clientEmail?: string;
  assignedEngineer?: string;
  selectedServiceIds: string[];
  planId?: string;
  projectCategory?: string;
  quotation?: QuotationBreakdown;
  advanceReceived?: number;
  remainingBalance?: number;
  grandTotal?: number;
  notes?: string;
  form?: InquiryWizardFormValues;
}

export interface ProjectProgress {
  completedCount: number;
  totalCount: number;
  percent: number;
}

export const PROJECTS_STORAGE_KEY = "st-manager-projects";

/** @deprecated Use StudioProject from @/lib/projects/types */
export type CreatedProject = Pick<
  StudioProject,
  | "id"
  | "inquiryId"
  | "clientName"
  | "projectName"
  | "advanceReceived"
  | "remainingBalance"
  | "grandTotal"
  | "createdAt"
>;
