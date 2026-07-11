import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type {
  GetStudioUserProfileResponseDto,
  UpdateStudioUserProfileResponseDto,
} from "@st-manager/contracts";
import {
  updateStudioUserProfileSchema,
  type UpdateStudioUserProfileInput,
} from "@st-manager/validation";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProfileService } from "./profile.service";

@Controller(ROUTES.PROFILE)
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<GetStudioUserProfileResponseDto> {
    const data = await this.profileService.getProfile(user);
    return { success: true, data };
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateStudioUserProfileSchema)) body: UpdateStudioUserProfileInput,
  ): Promise<UpdateStudioUserProfileResponseDto> {
    const data = await this.profileService.updateProfile(user, body);
    return { success: true, data };
  }
}
