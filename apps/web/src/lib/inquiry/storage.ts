import type {
  InquiryWizardFormValues,
  QuotationBreakdown,
  SavedInquiry,
} from "./types";
import {
  INQUIRIES_STORAGE_KEY,
  WIZARD_DRAFT_STORAGE_KEY,
} from "./types";
import { notifyInquiriesUpdated } from "./events";
import { isBrowserOnline } from "@/lib/sync";

import {
  createInquiryOptimistic,
  flushPendingInquiryCreates,
  getInquiriesStoreSnapshot,
  getInquiryFromSnapshot,
  hydrateInquiriesSnapshotFromCache,
  pushInquiryDeleteToApi,
  pushInquiryUpdateToApi,
  removeInquiryFromSnapshot,
  upsertInquiryInSnapshot,
} from "./store";
import {
  getInquiriesSnapshot,
  setInquiriesSnapshot,
} from "./snapshots";
import {
  isLocalInquiryId,
  removePendingInquiryCreate,
  updatePendingInquiryCreate,
  type PendingInquiryCreatePayload,
} from "./offline-queue";
import { savedInquiryPatchToUpdateDto, savedInquiryToCreateDto } from "./map-dto";

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

function ensureInquiriesHydrated(): SavedInquiry[] {
  if (getInquiriesStoreSnapshot().length === 0) {
    hydrateInquiriesSnapshotFromCache();
  }
  return getInquiriesStoreSnapshot();
}

function buildCreatePayload(input: {
  form: InquiryWizardFormValues;
  quotation: QuotationBreakdown;
  status: SavedInquiry["status"];
  projectId?: string;
  advanceAmount?: number;
  remainingBalance?: number;
}): PendingInquiryCreatePayload {
  return {
    status: input.status,
    projectId: input.projectId ?? null,
    advanceAmount: input.advanceAmount ?? null,
    remainingBalance: input.remainingBalance ?? null,
    form: input.form,
    quotation: input.quotation,
  };
}

function buildPatchPayload(
  patch: Partial<
    Pick<SavedInquiry, "form" | "quotation" | "status" | "projectId" | "advanceAmount" | "remainingBalance">
  >,
): PendingInquiryCreatePayload | null {
  const dto = savedInquiryPatchToUpdateDto(patch);
  if (dto.form === undefined || dto.quotation === undefined) {
    return null;
  }
  return {
    status: dto.status ?? "inquiry",
    projectId: dto.projectId ?? null,
    advanceAmount: dto.advanceAmount ?? null,
    remainingBalance: dto.remainingBalance ?? null,
    form: dto.form,
    quotation: dto.quotation,
  };
}

export function listInquiries(): SavedInquiry[] {
  return ensureInquiriesHydrated();
}

export function getInquiry(id: string): SavedInquiry | undefined {
  return ensureInquiriesHydrated().find((inquiry) => inquiry.id === id);
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
  const existing = input.id ? getInquiry(input.id) : undefined;

  if (existing) {
    return (
      updateInquiryRecord(existing.id, {
        form: input.form,
        quotation: input.quotation,
        status: input.status,
        projectId: input.projectId ?? existing.projectId,
        advanceAmount: input.advanceAmount ?? existing.advanceAmount,
        remainingBalance: input.remainingBalance ?? existing.remainingBalance,
      }) ?? existing
    );
  }

  ensureInquiriesHydrated();
  const payload = buildCreatePayload(input);
  const inquiry = createInquiryOptimistic(payload);
  if (isBrowserOnline()) {
    void flushPendingInquiryCreates();
  }
  return inquiry;
}

export function updateInquiryRecord(
  id: string,
  patch: Partial<
    Pick<SavedInquiry, "form" | "quotation" | "status" | "projectId" | "advanceAmount" | "remainingBalance">
  >,
): SavedInquiry | null {
  const inquiries = ensureInquiriesHydrated();
  const index = inquiries.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return null;
  }

  const updated: SavedInquiry = {
    ...inquiries[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  upsertInquiryInSnapshot(updated);
  notifyInquiriesUpdated();

  if (isLocalInquiryId(id)) {
    const nextPayload = buildPatchPayload({
      form: updated.form,
      quotation: updated.quotation,
      status: updated.status,
      projectId: updated.projectId,
      advanceAmount: updated.advanceAmount,
      remainingBalance: updated.remainingBalance,
    });
    if (nextPayload) {
      updatePendingInquiryCreate(id, { payload: nextPayload });
    } else {
      const existingPayload = buildCreatePayload({
        form: updated.form,
        quotation: updated.quotation,
        status: updated.status,
        projectId: updated.projectId,
        advanceAmount: updated.advanceAmount,
        remainingBalance: updated.remainingBalance,
      });
      updatePendingInquiryCreate(id, { payload: existingPayload });
    }
  } else {
    void pushInquiryUpdateToApi(id, patch);
  }

  if (isBrowserOnline()) {
    void flushPendingInquiryCreates();
  }

  return updated;
}

export function deleteInquiry(id: string): boolean {
  const inquiries = ensureInquiriesHydrated();
  if (!inquiries.some((entry) => entry.id === id)) {
    return false;
  }

  removeInquiryFromSnapshot(id);
  notifyInquiriesUpdated();
  void pushInquiryDeleteToApi(id);

  if (isLocalInquiryId(id)) {
    removePendingInquiryCreate(id);
  }

  return true;
}

export function linkInquiryToProject(inquiryId: string, projectId: string): void {
  updateInquiryRecord(inquiryId, {
    projectId,
    status: "project",
  });
}

/** Rewrites inquiry.projectId when a project id is remapped during sync/backfill. */
export function remapInquiryProjectReferences(oldProjectId: string, newProjectId: string): void {
  if (oldProjectId === newProjectId) {
    return;
  }

  for (const inquiry of ensureInquiriesHydrated()) {
    if (inquiry.projectId !== oldProjectId) {
      continue;
    }
    updateInquiryRecord(inquiry.id, { projectId: newProjectId });
  }
}

export function initializeInquirySnapshots(): void {
  hydrateInquiriesSnapshotFromCache();
  setInquiriesSnapshot(getInquiriesStoreSnapshot());
}

export {
  getInquiryFromSnapshot,
  getInquiriesSnapshot,
  INQUIRIES_STORAGE_KEY,
  flushPendingInquiryCreates,
  isLocalInquiryId,
  savedInquiryToCreateDto,
};

// Project CRUD moved to @/lib/projects — re-export for backward compatibility.
export {
  createProject,
  createProjectFromInquiry,
  getProject,
  listProjects,
  updateProject,
  updateProjectTasks,
} from "@/lib/projects/storage";
