import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { InvitationsController, PermissionsController, TeamController } from "./team.controller";
import { TeamRepository } from "./team.repository";
import { TeamService } from "./team.service";
import { OwnerGuard } from "./guards/owner.guard";
import { TeamViewerGuard } from "./guards/team-viewer.guard";

@Module({
  imports: [AuthModule, EmailModule, AuditModule],
  controllers: [TeamController, InvitationsController, PermissionsController],
  providers: [TeamService, TeamRepository, OwnerGuard, TeamViewerGuard],
})
export class TeamModule {}
