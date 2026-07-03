import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ClientsModule } from "../clients/clients.module";
import { StudiosModule } from "../studios/studios.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [AuthModule, StudiosModule, ClientsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
