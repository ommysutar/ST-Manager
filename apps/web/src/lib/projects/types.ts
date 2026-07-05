import type { InquiryWizardFormValues, QuotationBreakdown } from "@/lib/inquiry/types";

export type ProjectStatus = "active" | "on_hold" | "completed" | "cancelled";
export type ProjectSource = "inquiry" | "manual";
export type TaskStatus = "pending" | "in_progress" | "completed";

/** Central studio project entity — single source of truth for all workflows. */
export interface StudioProject {
  id: string;
  source: ProjectSource;
  inquiryId?: string;
  projectName: string;
  clientName: string;
  clientMobile?: string;
  clientEmail?: string;
  status: ProjectStatus;
  assignedEngineer: string;
  selectedServiceIds: string[];
  planId?: string;
  quotation?: QuotationBreakdown;
  advanceReceived: number;
  remainingBalance: number;
  grandTotal: number;
  tasks: ProjectTask[];
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
  assignedEngineer: string;
  estimatedDurationMinutes: number;
  actualDurationMinutes?: number;
  notes: string;
  status: TaskStatus;
  completed: boolean;
  dueDate?: string;
  sortOrder: number;
}

export interface CreateProjectInput {
  source: ProjectSource;
  inquiryId?: string;
  projectName: string;
  clientName: string;
  clientMobile?: string;
  clientEmail?: string;
  assignedEngineer?: string;
  selectedServiceIds: string[];
  planId?: string;
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
