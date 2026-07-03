import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { BookingsModule } from "../bookings/bookings.module";
import { SessionsModule } from "../sessions/sessions.module";
import { InvoicesModule } from "../invoices/invoices.module";
import { ReportsModule } from "../reports/reports.module";
import { ClientsModule } from "../clients/clients.module";
import { StudiosModule } from "../studios/studios.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [AuthModule, StudiosModule, ClientsModule, BookingsModule, SessionsModule, InvoicesModule, ReportsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
