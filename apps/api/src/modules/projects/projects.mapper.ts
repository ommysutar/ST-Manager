import type { ProjectResponseDto } from "@st-manager/contracts";
import type { Project } from "@st-manager/types";

export function toProjectResponseDto(project: Project): ProjectResponseDto {
  const { payload, createdAt, updatedAt, deletedAt, ...rest } = project;
  return {
    ...rest,
    ...payload,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    deletedAt: deletedAt ? deletedAt.toISOString() : null,
  };
}
