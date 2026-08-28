import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { InquiriesController } from "./inquiries.controller";
import { InquiriesRepository } from "./inquiries.repository";
import { InquiriesService } from "./inquiries.service";

@Module({
  imports: [AuthModule],
  controllers: [InquiriesController],
  providers: [InquiriesService, InquiriesRepository],
  exports: [InquiriesRepository],
})
export class InquiriesModule {}
