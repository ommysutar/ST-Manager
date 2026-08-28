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
  CreateStudioRoomResponseDto,
  DeleteStudioRoomResponseDto,
  GetStudioRoomResponseDto,
  ListStudioRoomsResponseDto,
  SyncStudioRoomsPullResponseDto,
  UpdateStudioRoomResponseDto,
} from "@st-manager/contracts";
import {
  createStudioRoomSchema,
  listStudioRoomsQuerySchema,
  syncStudioRoomsPullQuerySchema,
  updateStudioRoomSchema,
  type CreateStudioRoomInput,
  type ListStudioRoomsQueryInput,
  type SyncStudioRoomsPullQueryInput,
  type UpdateStudioRoomInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toStudioRoomResponseDto } from "./studio-rooms.mapper";
import { StudioRoomsService } from "./studio-rooms.service";

@Controller(ROUTES.STUDIO_ROOMS)
@UseGuards(JwtAuthGuard)
export class StudioRoomsController {
  constructor(private readonly studioRoomsService: StudioRoomsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createStudioRoomSchema)) body: CreateStudioRoomInput,
  ): Promise<CreateStudioRoomResponseDto> {
    const room = await this.studioRoomsService.create(user, body);
    return { success: true, data: toStudioRoomResponseDto(room) };
  }

  @Get("changes")
  async pullChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(syncStudioRoomsPullQuerySchema)) query: SyncStudioRoomsPullQueryInput,
  ): Promise<SyncStudioRoomsPullResponseDto> {
    const result = await this.studioRoomsService.pullChanges(user, query);
    return {
      success: true,
      data: {
        records: result.data.map(toStudioRoomResponseDto),
        serverTime: result.serverTime,
        hasMore: result.hasMore,
      },
    };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listStudioRoomsQuerySchema)) query: ListStudioRoomsQueryInput,
  ): Promise<ListStudioRoomsResponseDto> {
    const { data, meta } = await this.studioRoomsService.list(user, query);
    return { success: true, data: data.map(toStudioRoomResponseDto), meta };
  }

  @Get(":id")
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<GetStudioRoomResponseDto> {
    const room = await this.studioRoomsService.getById(user, id);
    return { success: true, data: toStudioRoomResponseDto(room) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStudioRoomSchema)) body: UpdateStudioRoomInput,
  ): Promise<UpdateStudioRoomResponseDto> {
    const room = await this.studioRoomsService.update(user, id, body);
    return { success: true, data: toStudioRoomResponseDto(room) };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<DeleteStudioRoomResponseDto> {
    await this.studioRoomsService.softDelete(user, id);
    return { success: true };
  }
}
