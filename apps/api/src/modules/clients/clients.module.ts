import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ClientsController } from "./clients.controller";
import { ClientsRepository } from "./clients.repository";
import { ClientsService } from "./clients.service";

@Module({
  imports: [AuthModule],
  controllers: [ClientsController],
  providers: [ClientsService, ClientsRepository],
  exports: [ClientsRepository],
})
export class ClientsModule {}
