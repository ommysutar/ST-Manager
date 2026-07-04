import type { InquiryWizardFormValues } from "./schema";

export type InquiryStatus = "inquiry" | "project";
export type ProjectPriority = "low" | "medium" | "high";

export interface StudioService {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  active: boolean;
}

export interface ProjectPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  highlighted?: boolean;
  active: boolean;
}

export type { InquiryWizardFormValues } from "./schema";

export interface QuotationBreakdown {
  planAmount: number;
  serviceLines: { id: string; name: string; price: number }[];
  servicesSubtotal: number;
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
}

export interface SavedInquiry {
  id: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  form: InquiryWizardFormValues;
  quotation: QuotationBreakdown;
  projectId?: string;
  advanceAmount?: number;
  remainingBalance?: number;
}

export interface CreatedProject {
  id: string;
  inquiryId: string;
  clientName: string;
  projectName: string;
  advanceReceived: number;
  remainingBalance: number;
  grandTotal: number;
  createdAt: string;
}

export const WIZARD_DRAFT_STORAGE_KEY = "st-manager-inquiry-wizard-draft";
export const INQUIRIES_STORAGE_KEY = "st-manager-inquiries";
export const PROJECTS_STORAGE_KEY = "st-manager-projects";
export const SERVICE_PRICING_STORAGE_KEY = "st-manager-service-pricing";
export const PROJECT_PLANS_STORAGE_KEY = "st-manager-project-plans";
