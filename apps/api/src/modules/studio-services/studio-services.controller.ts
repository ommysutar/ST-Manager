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
  CreateStudioServiceResponseDto,
  DeleteStudioServiceResponseDto,
  GetStudioServiceResponseDto,
  ListStudioServicesResponseDto,
  SyncStudioServicesPullResponseDto,
  UpdateStudioServiceResponseDto,
} from "@st-manager/contracts";
import {
  createStudioServiceSchema,
  listStudioServicesQuerySchema,
  syncStudioServicesPullQuerySchema,
  updateStudioServiceSchema,
  type CreateStudioServiceInput,
  type ListStudioServicesQueryInput,
  type SyncStudioServicesPullQueryInput,
  type UpdateStudioServiceInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toStudioServiceResponseDto } from "./studio-services.mapper";
import { StudioServicesService } from "./studio-services.service";

@Controller(ROUTES.STUDIO_SERVICES)
@UseGuards(JwtAuthGuard)
export class StudioServicesController {
  constructor(private readonly studioServicesService: StudioServicesService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createStudioServiceSchema)) body: CreateStudioServiceInput,
  ): Promise<CreateStudioServiceResponseDto> {
    const service = await this.studioServicesService.create(user, body);
    return { success: true, data: toStudioServiceResponseDto(service) };
  }

  @Get("changes")
  async pullChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(syncStudioServicesPullQuerySchema))
    query: SyncStudioServicesPullQueryInput,
  ): Promise<SyncStudioServicesPullResponseDto> {
    const result = await this.studioServicesService.pullChanges(user, query);
    return {
      success: true,
      data: {
        records: result.data.map(toStudioServiceResponseDto),
        serverTime: result.serverTime,
        hasMore: result.hasMore,
      },
    };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listStudioServicesQuerySchema)) query: ListStudioServicesQueryInput,
  ): Promise<ListStudioServicesResponseDto> {
    const { data, meta } = await this.studioServicesService.list(user, query);
    return { success: true, data: data.map(toStudioServiceResponseDto), meta };
  }

  @Get(":id")
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<GetStudioServiceResponseDto> {
    const service = await this.studioServicesService.getById(user, id);
    return { success: true, data: toStudioServiceResponseDto(service) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStudioServiceSchema)) body: UpdateStudioServiceInput,
  ): Promise<UpdateStudioServiceResponseDto> {
    const service = await this.studioServicesService.update(user, id, body);
    return { success: true, data: toStudioServiceResponseDto(service) };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<DeleteStudioServiceResponseDto> {
    await this.studioServicesService.softDelete(user, id);
    return { success: true };
  }
}
