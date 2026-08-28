import { notifyProjectsUpdated } from "@/lib/inquiry/events";
import { isBrowserOnline } from "@/lib/sync";

import { projectsApi } from "@/lib/api-client";

import { dtoToStudioProject, studioProjectToUpdateDto } from "./map-dto";
import { isLocalProjectId, updatePendingProjectCreate } from "./offline-queue";
import {
  createProjectOptimistic,
  flushPendingProjectCreates,
  getProjectsSnapshot,
  hydrateProjectsSnapshotFromCache,
  setProjectsSnapshot,
  upsertProjectInSnapshot,
} from "./store";
import type { CreateProjectInput, ProjectTask, StudioProject } from "./types";
import { PROJECTS_STORAGE_KEY } from "./types";
import type { InquiryWizardFormValues } from "@/lib/inquiry/types";

import { generateTasksFromServices } from "./tasks";
import type { PendingProjectCreatePayload } from "./offline-queue";

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

function assignMissingProjectNumbers(projects: StudioProject[]): StudioProject[] {
  let max = projects.reduce(
    (acc, project) => Math.max(acc, parseProjectNumber(project.projectNumber)),
    0,
  );
  let changed = false;

  const normalized = projects.map((project) => {
    if (project.projectNumber) {
      return project;
    }

    max += 1;
    changed = true;
    return { ...project, projectNumber: formatProjectNumber(max) };
  });

  if (changed) {
    for (const project of normalized) {
      upsertProjectInSnapshot(project);
    }
    notifyProjectsUpdated();
    return normalized;
  }

  return normalized;
}

function ensureProjectsHydrated(): StudioProject[] {
  if (getProjectsSnapshot().length === 0) {
    hydrateProjectsSnapshotFromCache();
  }
  return assignMissingProjectNumbers(getProjectsSnapshot());
}

function buildCreatePayload(input: CreateProjectInput): PendingProjectCreatePayload {
  const assignedEngineer = input.assignedEngineer ?? "";
  return {
    source: input.source,
    inquiryId: input.inquiryId ?? null,
    clientId: input.clientId || input.form?.existingClientId || null,
    projectName: input.projectName.trim(),
    clientName: input.clientName.trim(),
    clientMobile: input.clientMobile?.trim() || input.form?.mobileNumber || null,
    clientEmail: input.clientEmail?.trim() || input.form?.email || null,
    projectCategory: input.projectCategory ?? input.form?.projectCategory ?? null,
    status: "active",
    assignedEngineer,
    selectedServiceIds: input.selectedServiceIds,
    planId: input.planId ?? null,
    quotation: input.quotation,
    advanceReceived: input.advanceReceived ?? 0,
    remainingBalance: input.remainingBalance ?? 0,
    grandTotal: input.grandTotal ?? 0,
    notes: input.notes ?? input.form?.notes ?? null,
    tasks: generateTasksFromServices(input.selectedServiceIds, assignedEngineer),
    files: [],
    links: [],
    expenses: [],
    sessionIds: [],
    bookingIds: [],
    invoiceIds: [],
  };
}

export function loadAllProjects(): StudioProject[] {
  return ensureProjectsHydrated();
}

export function listProjects(): StudioProject[] {
  return loadAllProjects();
}

export function getProject(id: string): StudioProject | undefined {
  return loadAllProjects().find((project) => project.id === id);
}

export { getProjectsSnapshot, setProjectsSnapshot };

export function createProject(input: CreateProjectInput): StudioProject {
  ensureProjectsHydrated();
  const payload = buildCreatePayload(input);
  const project = createProjectOptimistic(payload);
  if (isBrowserOnline()) {
    void flushPendingProjectCreates();
  }
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

  upsertProjectInSnapshot(updated);
  notifyProjectsUpdated();

  if (isLocalProjectId(id)) {
    updatePendingProjectCreate(id, {
      payload: {
        ...buildCreatePayload({
          source: updated.source,
          inquiryId: updated.inquiryId,
          clientId: updated.clientId,
          projectName: updated.projectName,
          clientName: updated.clientName,
          clientMobile: updated.clientMobile,
          clientEmail: updated.clientEmail,
          assignedEngineer: updated.assignedEngineer,
          selectedServiceIds: updated.selectedServiceIds,
          planId: updated.planId,
          projectCategory: updated.projectCategory,
          quotation: updated.quotation,
          advanceReceived: updated.advanceReceived,
          remainingBalance: updated.remainingBalance,
          grandTotal: updated.grandTotal,
          notes: updated.notes,
        }),
        tasks: updated.tasks,
        files: updated.files,
        links: updated.links,
        expenses: updated.expenses,
        sessionIds: updated.sessionIds,
        bookingIds: updated.bookingIds,
        invoiceIds: updated.invoiceIds,
        status: updated.status,
      },
    });
  } else if (isBrowserOnline()) {
    void projectsApi
      .updateProject(id, studioProjectToUpdateDto(patch))
      .then((dto) => {
        upsertProjectInSnapshot(dtoToStudioProject(dto));
        notifyProjectsUpdated();
      })
      .catch(() => undefined);
  }

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
  hydrateProjectsSnapshotFromCache();
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
    projectCategory: input.form.projectCategory,
    quotation: input.quotation,
    advanceReceived: input.advanceAmount,
    remainingBalance: input.remainingBalance,
    grandTotal: input.quotation.grandTotal,
    form: input.form,
    notes: input.form.notes,
  });
}

export { PROJECTS_STORAGE_KEY, flushPendingProjectCreates };
