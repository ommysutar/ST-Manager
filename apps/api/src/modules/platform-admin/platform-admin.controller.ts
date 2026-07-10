import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type {
  PlatformAdminDashboardResponseDto,
  PlatformAdminLoginResponseDto,
  PlatformAuditLogListResponseDto,
  PlatformStudioActionResponseDto,
  PlatformStudioDetailResponseDto,
  PlatformStudioListResponseDto,
} from "@st-manager/contracts";
import {
  loginSchema,
  platformDeleteStudioSchema,
  platformStudioListQuerySchema,
  type LoginInput,
  type PlatformDeleteStudioInput,
  type PlatformStudioListQueryInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformAdminGuard } from "./guards/platform-admin.guard";
import { PlatformAdminService } from "./platform-admin.service";

@Controller(ROUTES.PLATFORM_ADMIN)
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @Post("auth/login")
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
  ): Promise<PlatformAdminLoginResponseDto> {
    const data = await this.platformAdminService.login(body);
    return { success: true, data };
  }

  @Get("dashboard")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async dashboard(): Promise<PlatformAdminDashboardResponseDto> {
    const data = await this.platformAdminService.getDashboard();
    return { success: true, data };
  }

  @Get("studios")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async listStudios(
    @Query(new ZodValidationPipe(platformStudioListQuerySchema))
    query: PlatformStudioListQueryInput,
  ): Promise<PlatformStudioListResponseDto> {
    const result = await this.platformAdminService.listStudios(query);
    return { success: true, ...result };
  }

  @Get("studios/:id")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async getStudio(@Param("id") id: string): Promise<PlatformStudioDetailResponseDto> {
    const data = await this.platformAdminService.getStudio(id);
    return { success: true, data };
  }

  @Post("studios/:id/disable")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async disableStudio(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformStudioActionResponseDto> {
    const data = await this.platformAdminService.disableStudio(id, user);
    return { success: true, data };
  }

  @Post("studios/:id/enable")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async enableStudio(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformStudioActionResponseDto> {
    const data = await this.platformAdminService.enableStudio(id, user);
    return { success: true, data };
  }

  @Post("studios/:id/delete")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async deleteStudio(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(platformDeleteStudioSchema)) body: PlatformDeleteStudioInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlatformStudioActionResponseDto> {
    const data = await this.platformAdminService.deleteStudio(id, body, user);
    return { success: true, data };
  }

  @Get("audit-logs")
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  async auditLogs(): Promise<PlatformAuditLogListResponseDto> {
    const data = await this.platformAdminService.listAuditLogs();
    return { success: true, data };
  }
}
