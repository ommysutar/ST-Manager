import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type {
  PlatformAdminDashboardResponseDto,
  PlatformAdminLoginResponseDto,
} from "@st-manager/contracts";
import { loginSchema, type LoginInput } from "@st-manager/validation";

import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
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
}
