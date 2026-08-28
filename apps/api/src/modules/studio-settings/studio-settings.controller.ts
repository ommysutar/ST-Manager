import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type {
  GetStudioSettingsResponseDto,
  SyncStudioSettingsPullResponseDto,
  UpdateStudioSettingsResponseDto,
} from "@st-manager/contracts";
import {
  syncStudioSettingsPullQuerySchema,
  updateStudioSettingsSchema,
  type SyncStudioSettingsPullQueryInput,
  type UpdateStudioSettingsInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toStudioSettingsResponseDto } from "./studio-settings.mapper";
import { StudioSettingsService } from "./studio-settings.service";

@Controller(ROUTES.STUDIO_SETTINGS)
@UseGuards(JwtAuthGuard)
export class StudioSettingsController {
  constructor(private readonly studioSettingsService: StudioSettingsService) {}

  @Get("changes")
  async pullChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(syncStudioSettingsPullQuerySchema))
    query: SyncStudioSettingsPullQueryInput,
  ): Promise<SyncStudioSettingsPullResponseDto> {
    const result = await this.studioSettingsService.pullChanges(user, query);
    return {
      success: true,
      data: {
        records: result.data.map(toStudioSettingsResponseDto),
        serverTime: result.serverTime,
        hasMore: result.hasMore,
      },
    };
  }

  @Get()
  async get(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GetStudioSettingsResponseDto> {
    const settings = await this.studioSettingsService.getOrCreate(user);
    return { success: true, data: toStudioSettingsResponseDto(settings) };
  }

  @Patch()
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateStudioSettingsSchema)) body: UpdateStudioSettingsInput,
  ): Promise<UpdateStudioSettingsResponseDto> {
    const settings = await this.studioSettingsService.upsert(user, body);
    return { success: true, data: toStudioSettingsResponseDto(settings) };
  }
}
