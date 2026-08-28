import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { StudioRoomsController } from "./studio-rooms.controller";
import { StudioRoomsRepository } from "./studio-rooms.repository";
import { StudioRoomsService } from "./studio-rooms.service";

@Module({
  imports: [AuthModule],
  controllers: [StudioRoomsController],
  providers: [StudioRoomsService, StudioRoomsRepository],
  exports: [StudioRoomsRepository],
})
export class StudioRoomsModule {}
