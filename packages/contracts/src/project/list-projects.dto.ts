import type { PaginatedResponseDto } from "../common/pagination.dto";
import type { ProjectResponseDto } from "./project-response.dto";

export interface ListProjectsQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
}

export type ListProjectsResponseDto = PaginatedResponseDto<ProjectResponseDto>;

export type CreateProjectResponseDto = {
  success: true;
  data: ProjectResponseDto;
};

export type UpdateProjectResponseDto = {
  success: true;
  data: ProjectResponseDto;
};

export type GetProjectResponseDto = {
  success: true;
  data: ProjectResponseDto;
};

export type DeleteProjectResponseDto = {
  success: true;
};

/** Incremental Project API sync pull (studio-scoped; includes soft-deletes). */
export interface SyncProjectsPullQueryDto {
  since?: string;
}

export interface SyncProjectsPullResponseDataDto {
  records: ProjectResponseDto[];
  serverTime: string;
  hasMore: boolean;
}

export type SyncProjectsPullResponseDto = {
  success: true;
  data: SyncProjectsPullResponseDataDto;
};
