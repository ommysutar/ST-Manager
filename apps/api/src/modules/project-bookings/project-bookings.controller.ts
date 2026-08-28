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
  CreateProjectBookingResponseDto,
  DeleteProjectBookingResponseDto,
  GetProjectBookingResponseDto,
  ListProjectBookingsResponseDto,
  SyncProjectBookingsPullResponseDto,
  UpdateProjectBookingResponseDto,
} from "@st-manager/contracts";
import {
  createProjectBookingSchema,
  listProjectBookingsQuerySchema,
  syncProjectBookingsPullQuerySchema,
  updateProjectBookingSchema,
  type CreateProjectBookingInput,
  type ListProjectBookingsQueryInput,
  type SyncProjectBookingsPullQueryInput,
  type UpdateProjectBookingInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toProjectBookingResponseDto } from "./project-bookings.mapper";
import { ProjectBookingsService } from "./project-bookings.service";

@Controller(ROUTES.PROJECT_BOOKINGS)
@UseGuards(JwtAuthGuard)
export class ProjectBookingsController {
  constructor(private readonly projectBookingsService: ProjectBookingsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createProjectBookingSchema)) body: CreateProjectBookingInput,
  ): Promise<CreateProjectBookingResponseDto> {
    const booking = await this.projectBookingsService.create(user, body);
    return { success: true, data: toProjectBookingResponseDto(booking) };
  }

  @Get("changes")
  async pullChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(syncProjectBookingsPullQuerySchema))
    query: SyncProjectBookingsPullQueryInput,
  ): Promise<SyncProjectBookingsPullResponseDto> {
    const result = await this.projectBookingsService.pullChanges(user, query);
    return {
      success: true,
      data: {
        records: result.data.map(toProjectBookingResponseDto),
        serverTime: result.serverTime,
        hasMore: result.hasMore,
      },
    };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listProjectBookingsQuerySchema)) query: ListProjectBookingsQueryInput,
  ): Promise<ListProjectBookingsResponseDto> {
    const { data, meta } = await this.projectBookingsService.list(user, query);
    return { success: true, data: data.map(toProjectBookingResponseDto), meta };
  }

  @Get(":id")
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<GetProjectBookingResponseDto> {
    const booking = await this.projectBookingsService.getById(user, id);
    return { success: true, data: toProjectBookingResponseDto(booking) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProjectBookingSchema)) body: UpdateProjectBookingInput,
  ): Promise<UpdateProjectBookingResponseDto> {
    const booking = await this.projectBookingsService.update(user, id, body);
    return { success: true, data: toProjectBookingResponseDto(booking) };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<DeleteProjectBookingResponseDto> {
    await this.projectBookingsService.softDelete(user, id);
    return { success: true };
  }
}
