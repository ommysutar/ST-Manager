import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { StudioServicesController } from "./studio-services.controller";
import { StudioServicesRepository } from "./studio-services.repository";
import { StudioServicesService } from "./studio-services.service";

@Module({
  imports: [AuthModule],
  controllers: [StudioServicesController],
  providers: [StudioServicesService, StudioServicesRepository],
  exports: [StudioServicesRepository],
})
export class StudioServicesModule {}
