import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { SyncController } from "./sync.controller";
import { SyncRepository } from "./sync.repository";
import { SyncService } from "./sync.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SyncController],
  providers: [SyncRepository, SyncService],
})
export class SyncModule {}
