import { PROJECT_STATUS_LABELS } from "./constants";
import { getPrimaryEngineer } from "./progress";
import type { StudioProject } from "./types";

const COMPLETED_STATUSES = new Set<StudioProject["status"]>(["delivered", "completed"]);
const ACTIVE_STATUSES = new Set<StudioProject["status"]>(["active", "on_hold"]);

export function isActiveProject(project: StudioProject): boolean {
  return ACTIVE_STATUSES.has(project.status);
}

export function isCompletedProject(project: StudioProject): boolean {
  return COMPLETED_STATUSES.has(project.status);
}

export function filterActiveProjects(projects: StudioProject[]): StudioProject[] {
  return projects.filter(isActiveProject);
}

export function filterCompletedProjects(projects: StudioProject[]): StudioProject[] {
  return projects.filter(isCompletedProject);
}

/** Matches the Project List search box against number, name, client, category, engineer, and status. */
export function filterProjectsBySearch(projects: StudioProject[], query: string): StudioProject[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return projects;
  }

  return projects.filter((project) => {
    const haystack = [
      project.projectNumber,
      project.projectName,
      project.clientName,
      project.projectCategory ?? "",
      project.assignedEngineer,
      getPrimaryEngineer(project),
      PROJECT_STATUS_LABELS[project.status] ?? project.status,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}
