import { Module } from "@nestjs/common";

import { ClientsModule } from "../clients/clients.module";
import { SessionsModule } from "../sessions/sessions.module";
import { InvoicesController } from "./invoices.controller";
import { InvoicesRepository } from "./invoices.repository";
import { InvoicesService } from "./invoices.service";

@Module({
  imports: [ClientsModule, SessionsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesRepository],
  exports: [InvoicesRepository],
})
export class InvoicesModule {}
