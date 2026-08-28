import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type {
  CreateProjectResponseDto,
  DeleteProjectResponseDto,
  GetProjectResponseDto,
  ListProjectsResponseDto,
  SyncProjectsPullResponseDto,
  UpdateProjectResponseDto,
} from "@st-manager/contracts";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  syncProjectsPullQuerySchema,
  updateProjectSchema,
  type CreateProjectInput,
  type ListProjectsQueryInput,
  type SyncProjectsPullQueryInput,
  type UpdateProjectInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toProjectResponseDto } from "./projects.mapper";
import { ProjectsService } from "./projects.service";

@Controller(ROUTES.PROJECTS)
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectInput,
  ): Promise<CreateProjectResponseDto> {
    const project = await this.projectsService.create(user, body);
    return { success: true, data: toProjectResponseDto(project) };
  }

  @Get("changes")
  async pullChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(syncProjectsPullQuerySchema)) query: SyncProjectsPullQueryInput,
  ): Promise<SyncProjectsPullResponseDto> {
    const result = await this.projectsService.pullChanges(user, query);
    return {
      success: true,
      data: {
        records: result.data.map(toProjectResponseDto),
        serverTime: result.serverTime,
        hasMore: result.hasMore,
      },
    };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listProjectsQuerySchema)) query: ListProjectsQueryInput,
  ): Promise<ListProjectsResponseDto> {
    const { data, meta } = await this.projectsService.list(user, query);
    return { success: true, data: data.map(toProjectResponseDto), meta };
  }

  @Get(":id")
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<GetProjectResponseDto> {
    const project = await this.projectsService.getById(user, id);
    return { success: true, data: toProjectResponseDto(project) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectInput,
  ): Promise<UpdateProjectResponseDto> {
    const project = await this.projectsService.update(user, id, body);
    return { success: true, data: toProjectResponseDto(project) };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<DeleteProjectResponseDto> {
    await this.projectsService.softDelete(user, id);
    return { success: true };
  }
}
