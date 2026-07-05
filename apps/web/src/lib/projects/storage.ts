import { notifyProjectsUpdated } from "@/lib/inquiry/events";
import { generateId } from "@/lib/inquiry/services";

import { generateTasksFromServices } from "./tasks";
import type { CreateProjectInput, ProjectTask, StudioProject } from "./types";
import { PROJECTS_STORAGE_KEY } from "./types";
import type { InquiryWizardFormValues } from "@/lib/inquiry/types";

let projectsSnapshot: StudioProject[] = [];

export function getProjectsSnapshot(): StudioProject[] {
  return projectsSnapshot;
}

export function setProjectsSnapshot(next: StudioProject[]): StudioProject[] {
  projectsSnapshot = next;
  return projectsSnapshot;
}

function normalizeLegacyProject(raw: Record<string, unknown>): StudioProject {
  const now = new Date().toISOString();
  const selectedServiceIds = Array.isArray(raw.selectedServiceIds)
    ? (raw.selectedServiceIds as string[])
    : [];

  return {
    id: String(raw.id),
    source: raw.source === "manual" ? "manual" : "inquiry",
    inquiryId: raw.inquiryId ? String(raw.inquiryId) : undefined,
    projectName: String(raw.projectName ?? "Untitled Project"),
    clientName: String(raw.clientName ?? "Unknown Client"),
    clientMobile: raw.clientMobile ? String(raw.clientMobile) : undefined,
    clientEmail: raw.clientEmail ? String(raw.clientEmail) : undefined,
    status: (raw.status as StudioProject["status"]) ?? "active",
    assignedEngineer: String(raw.assignedEngineer ?? ""),
    selectedServiceIds,
    planId: raw.planId ? String(raw.planId) : undefined,
    quotation: raw.quotation as StudioProject["quotation"],
    advanceReceived: Number(raw.advanceReceived ?? 0),
    remainingBalance: Number(raw.remainingBalance ?? 0),
    grandTotal: Number(raw.grandTotal ?? 0),
    tasks: Array.isArray(raw.tasks)
      ? (raw.tasks as ProjectTask[])
      : generateTasksFromServices(selectedServiceIds, String(raw.assignedEngineer ?? "")),
    sessionIds: Array.isArray(raw.sessionIds) ? (raw.sessionIds as string[]) : [],
    bookingIds: Array.isArray(raw.bookingIds) ? (raw.bookingIds as string[]) : [],
    invoiceIds: Array.isArray(raw.invoiceIds) ? (raw.invoiceIds as string[]) : [],
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
  return readProjectsFromStorage();
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

  const project: StudioProject = {
    id: generateId("prj"),
    source: input.source,
    inquiryId: input.inquiryId,
    projectName: input.projectName.trim(),
    clientName: input.clientName.trim(),
    clientMobile: input.clientMobile?.trim() || input.form?.mobileNumber,
    clientEmail: input.clientEmail?.trim() || input.form?.email || undefined,
    status: "active",
    assignedEngineer,
    selectedServiceIds: input.selectedServiceIds,
    planId: input.planId,
    quotation: input.quotation,
    advanceReceived: input.advanceReceived ?? 0,
    remainingBalance: input.remainingBalance ?? 0,
    grandTotal: input.grandTotal ?? 0,
    tasks: generateTasksFromServices(input.selectedServiceIds, assignedEngineer),
    sessionIds: [],
    bookingIds: [],
    invoiceIds: [],
    notes: input.notes ?? input.form?.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };

  persistProjects([project, ...loadAllProjects()]);
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
    planId: input.form.planId,
    quotation: input.quotation,
    advanceReceived: input.advanceAmount,
    remainingBalance: input.remainingBalance,
    grandTotal: input.quotation.grandTotal,
    form: input.form,
  });
}
