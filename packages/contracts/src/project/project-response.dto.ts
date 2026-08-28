import type { Project, ProjectPayload } from "@st-manager/types";

export interface ProjectResponseDto
  extends Omit<Project, "createdAt" | "updatedAt" | "deletedAt" | "payload">,
    ProjectPayload {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
