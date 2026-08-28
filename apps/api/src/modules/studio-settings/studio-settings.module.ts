import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { StudioSettingsController } from "./studio-settings.controller";
import { StudioSettingsRepository } from "./studio-settings.repository";
import { StudioSettingsService } from "./studio-settings.service";

@Module({
  imports: [AuthModule],
  controllers: [StudioSettingsController],
  providers: [StudioSettingsService, StudioSettingsRepository],
  exports: [StudioSettingsRepository],
})
export class StudioSettingsModule {}
