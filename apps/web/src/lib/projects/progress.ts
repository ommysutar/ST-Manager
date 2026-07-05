import type { ProjectProgress, ProjectTask, StudioProject } from "./types";

export function calculateTaskProgress(tasks: ProjectTask[]): ProjectProgress {
  const totalCount = tasks.length;
  const completedCount = tasks.filter((task) => task.completed).length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return { completedCount, totalCount, percent };
}

export function calculateProjectProgress(project: StudioProject): ProjectProgress {
  return calculateTaskProgress(project.tasks);
}

export function getPrimaryEngineer(project: StudioProject): string {
  const inProgress = project.tasks.find((task) => task.status === "in_progress" && task.assignedEngineer);
  if (inProgress?.assignedEngineer) {
    return inProgress.assignedEngineer;
  }

  const assigned = project.tasks.find((task) => task.assignedEngineer);
  if (assigned?.assignedEngineer) {
    return assigned.assignedEngineer;
  }

  return project.assignedEngineer || "Unassigned";
}

export function getCurrentTaskIndex(tasks: ProjectTask[]): number {
  const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
  const inProgressIndex = sorted.findIndex((task) => task.status === "in_progress" && !task.completed);
  if (inProgressIndex !== -1) {
    return inProgressIndex;
  }

  return sorted.findIndex((task) => !task.completed);
}
