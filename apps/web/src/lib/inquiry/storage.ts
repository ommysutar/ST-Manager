import type {
  InquiryWizardFormValues,
  QuotationBreakdown,
  SavedInquiry,
} from "./types";
import {
  INQUIRIES_STORAGE_KEY,
  WIZARD_DRAFT_STORAGE_KEY,
} from "./types";
import { generateId } from "./services";
import { notifyInquiriesUpdated } from "./events";
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
    const parsed = raw ? (JSON.parse(raw) as SavedInquiry[]) : [];
    return assignMissingInquiryNumbers(parsed);
  } catch {
    return [];
  }
}

function parseInquiryNumber(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const match = value.match(/^INQ-(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function formatInquiryNumber(sequence: number): string {
  return `INQ-${String(sequence).padStart(4, "0")}`;
}

function nextInquiryNumber(inquiries: SavedInquiry[]): string {
  const max = inquiries.reduce(
    (acc, inquiry) => Math.max(acc, parseInquiryNumber(inquiry.inquiryNumber)),
    0,
  );
  return formatInquiryNumber(max + 1);
}

function assignMissingInquiryNumbers(inquiries: SavedInquiry[]): SavedInquiry[] {
  let max = inquiries.reduce(
    (acc, inquiry) => Math.max(acc, parseInquiryNumber(inquiry.inquiryNumber)),
    0,
  );

  return inquiries.map((inquiry) => {
    if (inquiry.inquiryNumber) {
      return inquiry;
    }
    max += 1;
    return { ...inquiry, inquiryNumber: formatInquiryNumber(max) };
  });
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
  id?: string;
}): SavedInquiry {
  const now = new Date().toISOString();
  const existing = input.id ? loadInquiries().find((entry) => entry.id === input.id) : undefined;

  const inquiry: SavedInquiry = {
    id: existing?.id ?? generateId("inq"),
    inquiryNumber: existing?.inquiryNumber ?? nextInquiryNumber(loadInquiries()),
    status: input.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    form: input.form,
    quotation: input.quotation,
    projectId: input.projectId ?? existing?.projectId,
    advanceAmount: input.advanceAmount ?? existing?.advanceAmount,
    remainingBalance: input.remainingBalance ?? existing?.remainingBalance,
  };

  const others = loadInquiries().filter((entry) => entry.id !== inquiry.id);
  persistInquiries([inquiry, ...others]);
  return inquiry;
}

export function updateInquiryRecord(
  id: string,
  patch: Partial<
    Pick<SavedInquiry, "form" | "quotation" | "status" | "projectId" | "advanceAmount" | "remainingBalance">
  >,
): SavedInquiry | null {
  const inquiries = loadInquiries();
  const index = inquiries.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return null;
  }

  const updated: SavedInquiry = {
    ...inquiries[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  inquiries[index] = updated;
  persistInquiries(inquiries);
  return updated;
}

export function deleteInquiry(id: string): boolean {
  const inquiries = loadInquiries();
  const next = inquiries.filter((entry) => entry.id !== id);
  if (next.length === inquiries.length) {
    return false;
  }

  persistInquiries(next);
  return true;
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

/** Rewrites inquiry.projectId when a project id is remapped during sync/backfill. */
export function remapInquiryProjectReferences(oldProjectId: string, newProjectId: string): void {
  if (oldProjectId === newProjectId) {
    return;
  }
  persistInquiries(
    loadInquiries().map((inquiry) =>
      inquiry.projectId === oldProjectId
        ? { ...inquiry, projectId: newProjectId, updatedAt: new Date().toISOString() }
        : inquiry,
    ),
  );
}

export function initializeInquirySnapshots(): void {
  setInquiriesSnapshot(listInquiries());
}

// Project CRUD moved to @/lib/projects — re-export for backward compatibility.
export {
  createProject,
  createProjectFromInquiry,
  getProject,
  listProjects,
  updateProject,
  updateProjectTasks,
} from "@/lib/projects/storage";
