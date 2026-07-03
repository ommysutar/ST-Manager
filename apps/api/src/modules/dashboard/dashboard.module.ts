import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { BookingsModule } from "../bookings/bookings.module";
import { SessionsModule } from "../sessions/sessions.module";
import { ClientsModule } from "../clients/clients.module";
import { StudiosModule } from "../studios/studios.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [AuthModule, StudiosModule, ClientsModule, BookingsModule, SessionsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
