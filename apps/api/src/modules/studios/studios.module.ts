import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { StudiosController } from "./studios.controller";
import { StudiosRepository } from "./studios.repository";
import { StudiosService } from "./studios.service";

/**
 * No explicit `imports` — `PrismaModule` is `@Global()` (M3), so
 * `PrismaService` is already available to `StudiosRepository` without
 * re-importing it here.
 */
@Module({
  imports: [AuthModule],
  controllers: [StudiosController],
  providers: [StudiosService, StudiosRepository],
  exports: [StudiosRepository],
})
export class StudiosModule {}
