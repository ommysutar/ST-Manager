import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { ProjectBookingsController } from "./project-bookings.controller";
import { ProjectBookingsRepository } from "./project-bookings.repository";
import { ProjectBookingsService } from "./project-bookings.service";

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [ProjectBookingsController],
  providers: [ProjectBookingsService, ProjectBookingsRepository],
  exports: [ProjectBookingsRepository],
})
export class ProjectBookingsModule {}
