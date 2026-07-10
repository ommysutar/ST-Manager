import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { PlatformAdminController } from "./platform-admin.controller";
import { PlatformAdminRepository } from "./platform-admin.repository";
import { PlatformAdminService } from "./platform-admin.service";
import { PlatformAdminGuard } from "./guards/platform-admin.guard";
import { StudioLicenseController } from "./studio-license.controller";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PlatformAdminController, StudioLicenseController],
  providers: [PlatformAdminRepository, PlatformAdminService, PlatformAdminGuard],
  exports: [PlatformAdminService, PlatformAdminGuard],
})
export class PlatformAdminModule {}
