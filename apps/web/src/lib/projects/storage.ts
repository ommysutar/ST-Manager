import { notifyProjectsUpdated } from "@/lib/inquiry/events";
import { generateId } from "@/lib/inquiry/services";

import type { CreateProjectInput, ProjectFile, ProjectTask, StudioProject } from "./types";
import { PROJECTS_STORAGE_KEY } from "./types";
import type { InquiryWizardFormValues } from "@/lib/inquiry/types";

import { ensureMandatoryTasks, generateTasksFromServices } from "./tasks";

function parseProjectNumber(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const match = value.match(/^PRJ-(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function formatProjectNumber(sequence: number): string {
  return `PRJ-${String(sequence).padStart(4, "0")}`;
}

function nextProjectNumber(projects: StudioProject[]): string {
  const max = projects.reduce((acc, project) => Math.max(acc, parseProjectNumber(project.projectNumber)), 0);
  return formatProjectNumber(max + 1);
}

function assignMissingProjectNumbers(projects: StudioProject[]): StudioProject[] {
  let max = projects.reduce((acc, project) => Math.max(acc, parseProjectNumber(project.projectNumber)), 0);
  let changed = false;

  const normalized = projects.map((project) => {
    if (project.projectNumber) {
      return project;
    }

    max += 1;
    changed = true;
    return { ...project, projectNumber: formatProjectNumber(max) };
  });

  if (changed && typeof window !== "undefined") {
    persistProjects(normalized);
    return normalized;
  }

  return normalized;
}

let projectsSnapshot: StudioProject[] = [];

export function getProjectsSnapshot(): StudioProject[] {
  return projectsSnapshot;
}

export function setProjectsSnapshot(next: StudioProject[]): StudioProject[] {
  projectsSnapshot = next;
  return projectsSnapshot;
}

/** Migrates legacy data-URL file entries into the cloud-metadata shape (never re-persists binary data). */
function normalizeLegacyFile(raw: Record<string, unknown>): ProjectFile {
  return {
    id: String(raw.id ?? generateId("file")),
    name: String(raw.name ?? "Untitled file"),
    type: String(raw.type ?? raw.mimeType ?? "file"),
    size: raw.size !== undefined ? Number(raw.size) : undefined,
    cloudUrl: String(raw.cloudUrl ?? raw.dataUrl ?? ""),
    provider: (raw.provider as ProjectFile["provider"]) ?? "other",
    uploadedAt: String(raw.uploadedAt ?? new Date().toISOString()),
    uploadedBy: String(raw.uploadedBy ?? ""),
  };
}

function normalizeLegacyProject(raw: Record<string, unknown>): StudioProject {
  const now = new Date().toISOString();
  const selectedServiceIds = Array.isArray(raw.selectedServiceIds)
    ? (raw.selectedServiceIds as string[])
    : [];
  const assignedEngineer = String(raw.assignedEngineer ?? "");
  const rawTasks = Array.isArray(raw.tasks)
    ? (raw.tasks as ProjectTask[])
    : generateTasksFromServices(selectedServiceIds, assignedEngineer);

  return {
    id: String(raw.id),
    projectNumber: raw.projectNumber ? String(raw.projectNumber) : "",
    source: raw.source === "manual" ? "manual" : "inquiry",
    inquiryId: raw.inquiryId ? String(raw.inquiryId) : undefined,
    clientId: raw.clientId ? String(raw.clientId) : undefined,
    projectName: String(raw.projectName ?? "Untitled Project"),
    clientName: String(raw.clientName ?? "Unknown Client"),
    projectCategory: raw.projectCategory ? String(raw.projectCategory) : undefined,
    clientMobile: raw.clientMobile ? String(raw.clientMobile) : undefined,
    clientEmail: raw.clientEmail ? String(raw.clientEmail) : undefined,
    status: (raw.status as StudioProject["status"]) ?? "active",
    assignedEngineer,
    selectedServiceIds,
    planId: raw.planId ? String(raw.planId) : undefined,
    quotation: raw.quotation as StudioProject["quotation"],
    advanceReceived: Number(raw.advanceReceived ?? 0),
    remainingBalance: Number(raw.remainingBalance ?? 0),
    grandTotal: Number(raw.grandTotal ?? 0),
    tasks: ensureMandatoryTasks(rawTasks, assignedEngineer),
    sessionIds: Array.isArray(raw.sessionIds) ? (raw.sessionIds as string[]) : [],
    bookingIds: Array.isArray(raw.bookingIds) ? (raw.bookingIds as string[]) : [],
    invoiceIds: Array.isArray(raw.invoiceIds) ? (raw.invoiceIds as string[]) : [],
    files: Array.isArray(raw.files)
      ? (raw.files as Record<string, unknown>[]).map((file) => normalizeLegacyFile(file))
      : [],
    links: Array.isArray(raw.links) ? (raw.links as StudioProject["links"]) : [],
    expenses: Array.isArray(raw.expenses) ? (raw.expenses as StudioProject["expenses"]) : [],
    notes: String(raw.notes ?? ""),
    createdAt: String(raw.createdAt ?? now),
    updatedAt: String(raw.updatedAt ?? raw.createdAt ?? now),
  };
}

function readProjectsFromStorage(): StudioProject[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((entry) => normalizeLegacyProject(entry));
  } catch {
    return [];
  }
}

function readProjectsWithMigration(): StudioProject[] {
  const projects = readProjectsFromStorage();
  return assignMissingProjectNumbers(projects);
}

function persistProjects(projects: StudioProject[]): StudioProject[] {
  const sorted = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(sorted));
  setProjectsSnapshot(sorted);
  notifyProjectsUpdated();
  return sorted;
}

export function loadAllProjects(): StudioProject[] {
  return readProjectsWithMigration();
}

export function listProjects(): StudioProject[] {
  return loadAllProjects();
}

export function getProject(id: string): StudioProject | undefined {
  return loadAllProjects().find((project) => project.id === id);
}

export function createProject(input: CreateProjectInput): StudioProject {
  const now = new Date().toISOString();
  const assignedEngineer = input.assignedEngineer ?? "";

  const existing = loadAllProjects();
  const project: StudioProject = {
    id: generateId("prj"),
    projectNumber: nextProjectNumber(existing),
    source: input.source,
    inquiryId: input.inquiryId,
    clientId: input.clientId || input.form?.existingClientId || undefined,
    projectName: input.projectName.trim(),
    clientName: input.clientName.trim(),
    clientMobile: input.clientMobile?.trim() || input.form?.mobileNumber,
    clientEmail: input.clientEmail?.trim() || input.form?.email || undefined,
    status: "active",
    assignedEngineer,
    selectedServiceIds: input.selectedServiceIds,
    planId: input.planId,
    projectCategory: input.projectCategory ?? input.form?.projectCategory,
    quotation: input.quotation,
    advanceReceived: input.advanceReceived ?? 0,
    remainingBalance: input.remainingBalance ?? 0,
    grandTotal: input.grandTotal ?? 0,
    tasks: generateTasksFromServices(input.selectedServiceIds, assignedEngineer),
    files: [],
    links: [],
    expenses: [],
    sessionIds: [],
    bookingIds: [],
    invoiceIds: [],
    notes: input.notes ?? input.form?.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };

  persistProjects([project, ...existing]);
  return project;
}

export function updateProject(
  id: string,
  patch: Partial<Omit<StudioProject, "id" | "createdAt">>,
): StudioProject | null {
  const projects = loadAllProjects();
  const index = projects.findIndex((project) => project.id === id);
  if (index === -1) {
    return null;
  }

  const updated: StudioProject = {
    ...projects[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  projects[index] = updated;
  persistProjects(projects);
  return updated;
}

export function updateProjectTasks(id: string, tasks: ProjectTask[]): StudioProject | null {
  return updateProject(id, { tasks });
}

/**
 * Keeps the "Payment" mandatory task's completion state in lock-step with the payment ledger
 * (via `project.remainingBalance`), so the task flow never diverges from the financial source of
 * truth. Returns the tasks array, patched if a change was required.
 */
function syncPaymentTaskState(project: StudioProject): ProjectTask[] {
  const fullyPaid = project.grandTotal <= 0 || project.remainingBalance <= 0;
  const paymentTask = project.tasks.find((task) => task.mandatoryKey === "payment");
  if (!paymentTask || paymentTask.completed === fullyPaid) {
    return project.tasks;
  }

  const now = new Date().toISOString();
  return project.tasks.map((task) =>
    task.id === paymentTask.id
      ? {
          ...task,
          completed: fullyPaid,
          status: fullyPaid ? "completed" : "pending",
          completedDate: fullyPaid ? now : undefined,
        }
      : task,
  );
}

/**
 * Central project-completion rule engine. Runs after any task update or payment change.
 *
 * - The "Payment" mandatory task is auto-synced from `remainingBalance` (single source of truth
 *   stays the payment ledger — see `lib/payments/storage.ts`).
 * - Status becomes `delivered` once the "Project Delivery" task is completed.
 * - Status becomes `completed` once every task is complete AND the project is fully paid — this
 *   automatically covers "Files Shared" and "Project Delivery" since they are tasks themselves.
 * - `on_hold` / `cancelled` are manual-only statuses and are never overridden automatically.
 */
export function evaluateProjectCompletion(projectId: string): StudioProject | null {
  const project = getProject(projectId);
  if (!project) {
    return null;
  }

  const syncedTasks = syncPaymentTaskState(project);
  const tasksChanged = syncedTasks !== project.tasks;

  if (project.status === "on_hold" || project.status === "cancelled") {
    return tasksChanged ? updateProject(projectId, { tasks: syncedTasks }) : project;
  }

  const deliveryTask = syncedTasks.find((task) => task.mandatoryKey === "project_delivery");
  const allTasksCompleted = syncedTasks.length > 0 && syncedTasks.every((task) => task.completed);
  const fullyPaid = project.grandTotal <= 0 || project.remainingBalance <= 0;

  let nextStatus: StudioProject["status"] = project.status;
  if (allTasksCompleted && fullyPaid) {
    nextStatus = "completed";
  } else if (deliveryTask?.completed) {
    nextStatus = "delivered";
  } else if (project.status === "delivered" || project.status === "completed") {
    nextStatus = "active";
  }

  if (tasksChanged || nextStatus !== project.status) {
    return updateProject(projectId, {
      tasks: syncedTasks,
      status: nextStatus,
    });
  }

  return project;
}

export function initializeProjectSnapshots(): void {
  setProjectsSnapshot(listProjects());
}

/** Backward-compatible wrapper used by inquiry wizard. */
export function createProjectFromInquiry(input: {
  inquiryId: string;
  form: InquiryWizardFormValues;
  quotation: NonNullable<CreateProjectInput["quotation"]>;
  advanceAmount: number;
  remainingBalance: number;
}): StudioProject {
  return createProject({
    source: "inquiry",
    inquiryId: input.inquiryId,
    projectName: input.form.projectName,
    clientName: input.form.clientName,
    assignedEngineer: "",
    selectedServiceIds: input.form.selectedServiceIds,
    planId: input.form.planId || undefined,
    projectCategory: input.form.projectCategory,
    quotation: input.quotation,
    advanceReceived: input.advanceAmount,
    remainingBalance: input.remainingBalance,
    grandTotal: input.quotation.grandTotal,
    form: input.form,
    notes: input.form.notes,
  });
}
