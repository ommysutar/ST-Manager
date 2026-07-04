import type {
  CreatedProject,
  InquiryWizardFormValues,
  QuotationBreakdown,
  SavedInquiry,
} from "./types";
import {
  INQUIRIES_STORAGE_KEY,
  PROJECTS_STORAGE_KEY,
  WIZARD_DRAFT_STORAGE_KEY,
} from "./types";
import { generateId } from "./services";
import { notifyInquiriesUpdated, notifyProjectsUpdated } from "./events";
import { setInquiriesSnapshot } from "./snapshots";

export interface WizardDraft {
  step: number;
  form: InquiryWizardFormValues;
  updatedAt: string;
}

export function loadWizardDraft(): WizardDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(WIZARD_DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WizardDraft) : null;
  } catch {
    return null;
  }
}

export function saveWizardDraft(draft: WizardDraft): void {
  localStorage.setItem(WIZARD_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearWizardDraft(): void {
  localStorage.removeItem(WIZARD_DRAFT_STORAGE_KEY);
}

function loadInquiries(): SavedInquiry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(INQUIRIES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedInquiry[]) : [];
  } catch {
    return [];
  }
}

function persistInquiries(inquiries: SavedInquiry[]): void {
  localStorage.setItem(INQUIRIES_STORAGE_KEY, JSON.stringify(inquiries));
  setInquiriesSnapshot(
    [...inquiries].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  );
  notifyInquiriesUpdated();
}

export function listInquiries(): SavedInquiry[] {
  return loadInquiries().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getInquiry(id: string): SavedInquiry | undefined {
  return loadInquiries().find((inquiry) => inquiry.id === id);
}

export function saveInquiryRecord(input: {
  form: InquiryWizardFormValues;
  quotation: QuotationBreakdown;
  status: SavedInquiry["status"];
  projectId?: string;
  advanceAmount?: number;
  remainingBalance?: number;
}): SavedInquiry {
  const now = new Date().toISOString();
  const inquiry: SavedInquiry = {
    id: generateId("inq"),
    status: input.status,
    createdAt: now,
    updatedAt: now,
    form: input.form,
    quotation: input.quotation,
    projectId: input.projectId,
    advanceAmount: input.advanceAmount,
    remainingBalance: input.remainingBalance,
  };

  persistInquiries([inquiry, ...loadInquiries()]);
  return inquiry;
}

export function linkInquiryToProject(inquiryId: string, projectId: string): void {
  persistInquiries(
    loadInquiries().map((inquiry) =>
      inquiry.id === inquiryId
        ? { ...inquiry, projectId, status: "project" as const, updatedAt: new Date().toISOString() }
        : inquiry,
    ),
  );
}

function loadProjects(): CreatedProject[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CreatedProject[]) : [];
  } catch {
    return [];
  }
}

function persistProjects(projects: CreatedProject[]): void {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  notifyProjectsUpdated();
}

export function getProject(id: string): CreatedProject | undefined {
  return loadProjects().find((project) => project.id === id);
}

export function createProjectFromInquiry(input: {
  inquiryId: string;
  form: InquiryWizardFormValues;
  quotation: QuotationBreakdown;
  advanceAmount: number;
  remainingBalance: number;
}): CreatedProject {
  const project: CreatedProject = {
    id: generateId("prj"),
    inquiryId: input.inquiryId,
    clientName: input.form.clientName,
    projectName: input.form.projectName,
    advanceReceived: input.advanceAmount,
    remainingBalance: input.remainingBalance,
    grandTotal: input.quotation.grandTotal,
    createdAt: new Date().toISOString(),
  };

  persistProjects([project, ...loadProjects()]);
  return project;
}

export function initializeInquirySnapshots(): void {
  setInquiriesSnapshot(listInquiries());
}
