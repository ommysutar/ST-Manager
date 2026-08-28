import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { BookingSlotDefinitionsController } from "./booking-slot-definitions.controller";
import { BookingSlotDefinitionsRepository } from "./booking-slot-definitions.repository";
import { BookingSlotDefinitionsService } from "./booking-slot-definitions.service";

@Module({
  imports: [AuthModule],
  controllers: [BookingSlotDefinitionsController],
  providers: [BookingSlotDefinitionsService, BookingSlotDefinitionsRepository],
  exports: [BookingSlotDefinitionsRepository],
})
export class BookingSlotDefinitionsModule {}
