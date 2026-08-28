import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";

import { PrismaModule } from "./common/prisma/prisma.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { StManagerNestLoggerService } from "./common/logging/st-manager-nest-logger.service";
import { validateEnv } from "./config/env.validation";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { StudiosModule } from "./modules/studios/studios.module";
import { SyncModule } from "./modules/sync/sync.module";
import { AiModule } from "./modules/ai/ai.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { InquiriesModule } from "./modules/inquiries/inquiries.module";
import { ProjectBookingsModule } from "./modules/project-bookings/project-bookings.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { StudioDocumentsModule } from "./modules/studio-documents/studio-documents.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { SessionsModule } from "./modules/sessions/sessions.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { TeamModule } from "./modules/team/team.module";
import { PlatformAdminModule } from "./modules/platform-admin/platform-admin.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { ClientPortalModule } from "./modules/client-portal/client-portal.module";
import { StudioServicesModule } from "./modules/studio-services/studio-services.module";
import { StudioRoomsModule } from "./modules/studio-rooms/studio-rooms.module";
import { BookingSlotDefinitionsModule } from "./modules/booking-slot-definitions/booking-slot-definitions.module";
import { StudioSettingsModule } from "./modules/studio-settings/studio-settings.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    StudiosModule,
    SyncModule,
    AiModule,
    DashboardModule,
    ClientsModule,
    ProjectsModule,
    InquiriesModule,
    ProjectBookingsModule,
    PaymentsModule,
    StudioDocumentsModule,
    BookingsModule,
    SessionsModule,
    InvoicesModule,
    ReportsModule,
    TeamModule,
    PlatformAdminModule,
    ProfileModule,
    ClientPortalModule,
    StudioServicesModule,
    StudioRoomsModule,
    BookingSlotDefinitionsModule,
    StudioSettingsModule,
  ],
  providers: [StManagerNestLoggerService, { provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
