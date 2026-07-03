import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type { SyncStudiosPullResponseDto, SyncStudiosPushResponseDto } from "@st-manager/contracts";
import {
  syncStudiosPullQuerySchema,
  syncStudiosPushSchema,
  type SyncStudiosPullQueryInput,
  type SyncStudiosPushInput,
} from "@st-manager/validation";

import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SyncService } from "./sync.service";

@Controller(ROUTES.SYNC)
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post("studios/push")
  async pushStudios(
    @Body(new ZodValidationPipe(syncStudiosPushSchema)) body: SyncStudiosPushInput,
  ): Promise<SyncStudiosPushResponseDto> {
    const data = await this.syncService.pushStudios(body);
    return { success: true, data };
  }

  @Get("studios")
  async pullStudios(
    @Query(new ZodValidationPipe(syncStudiosPullQuerySchema)) query: SyncStudiosPullQueryInput,
  ): Promise<SyncStudiosPullResponseDto> {
    const data = await this.syncService.pullStudios(query);
    return { success: true, data };
  }
}
