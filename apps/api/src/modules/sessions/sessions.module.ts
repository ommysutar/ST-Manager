import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module";
import { ClientsModule } from "../clients/clients.module";
import { StudiosModule } from "../studios/studios.module";
import { SessionsController } from "./sessions.controller";
import { SessionsRepository } from "./sessions.repository";
import { SessionsService } from "./sessions.service";

@Module({
  imports: [StudiosModule, ClientsModule, BookingsModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
  exports: [SessionsRepository],
})
export class SessionsModule {}
