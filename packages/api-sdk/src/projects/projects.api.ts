import { ROUTES } from "@st-manager/constants";
import type {
  CreateProjectResponseDto,
  CreateProjectDto,
  DeleteProjectResponseDto,
  GetProjectResponseDto,
  ListProjectsQueryDto,
  ListProjectsResponseDto,
  ProjectResponseDto,
  SyncProjectsPullQueryDto,
  SyncProjectsPullResponseDto,
  UpdateProjectDto,
  UpdateProjectResponseDto,
} from "@st-manager/contracts";
import {
  createProjectSchema,
  serializeProjectRequestBody,
  updateProjectSchema,
} from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface ProjectsApi {
  createProject(input: CreateProjectDto): Promise<ProjectResponseDto>;
  listProjects(query?: ListProjectsQueryDto): Promise<ListProjectsResponseDto>;
  pullProjectChanges(query?: SyncProjectsPullQueryDto): Promise<SyncProjectsPullResponseDto["data"]>;
  getProject(id: string): Promise<ProjectResponseDto>;
  updateProject(id: string, input: UpdateProjectDto): Promise<ProjectResponseDto>;
  deleteProject(id: string): Promise<void>;
}

export function createProjectsApi(client: HttpClient): ProjectsApi {
  return {
    createProject: async (input) => {
      const validated = createProjectSchema.parse(input);
      const response = await client.post<CreateProjectResponseDto>(
        ROUTES.PROJECTS,
        serializeProjectRequestBody(validated),
      );
      return response.data;
    },

    listProjects: (query = {}) =>
      client.get<ListProjectsResponseDto>(ROUTES.PROJECTS, {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
      }),

    pullProjectChanges: async (query = {}) => {
      const response = await client.get<SyncProjectsPullResponseDto>(`${ROUTES.PROJECTS}/changes`, {
        since: query.since,
      });
      return response.data;
    },

    getProject: async (id) => {
      const response = await client.get<GetProjectResponseDto>(`${ROUTES.PROJECTS}/${id}`);
      return response.data;
    },

    updateProject: async (id, input) => {
      const validated = updateProjectSchema.parse(input);
      const response = await client.patch<UpdateProjectResponseDto>(
        `${ROUTES.PROJECTS}/${id}`,
        serializeProjectRequestBody(validated),
      );
      return response.data;
    },

    deleteProject: async (id) => {
      await client.delete<DeleteProjectResponseDto>(`${ROUTES.PROJECTS}/${id}`);
    },
  };
}
