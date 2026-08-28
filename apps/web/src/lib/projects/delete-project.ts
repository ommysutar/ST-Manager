import type { StudioProject } from "./types";
import { projectsApi } from "@/lib/api-client";

import { notifyProjectsUpdated } from "@/lib/inquiry/events";

import { removeProjectFromSnapshot } from "./store";

export interface DeleteProjectResult {
  projectId: string;
}

export async function deleteProjectWithServerSync(
  project: StudioProject,
): Promise<DeleteProjectResult> {
  if (!project.id.startsWith("local_prj_")) {
    await projectsApi.deleteProject(project.id);
  }

  removeProjectFromSnapshot(project.id);
  notifyProjectsUpdated();

  return { projectId: project.id };
}
