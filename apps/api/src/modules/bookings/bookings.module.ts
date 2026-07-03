import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ClientsModule } from "../clients/clients.module";
import { StudiosModule } from "../studios/studios.module";
import { BookingsController } from "./bookings.controller";
import { BookingsRepository } from "./bookings.repository";
import { BookingsService } from "./bookings.service";

@Module({
  imports: [AuthModule, StudiosModule, ClientsModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRepository],
  exports: [BookingsRepository],
})
export class BookingsModule {}
