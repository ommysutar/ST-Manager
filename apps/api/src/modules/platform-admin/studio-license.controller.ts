import { Controller, Get, UseGuards } from "@nestjs/common";
import type { StudioLicenseResponseDto } from "@st-manager/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformAdminService } from "./platform-admin.service";

@Controller("studio-license")
export class StudioLicenseController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getCurrent(@CurrentUser() user: AuthenticatedUser): Promise<StudioLicenseResponseDto> {
    const data = await this.platformAdminService.getStudioLicense(user);
    return { success: true, data };
  }
}
