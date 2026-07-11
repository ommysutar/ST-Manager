import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { ClientPortalController } from "./client-portal.controller";
import { ClientPortalRepository } from "./client-portal.repository";
import { ClientPortalService } from "./client-portal.service";

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService, ClientPortalRepository],
})
export class ClientPortalModule {}
