import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";

import { PrismaModule } from "./common/prisma/prisma.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { StManagerNestLoggerService } from "./common/logging/st-manager-nest-logger.service";
import { validateEnv } from "./config/env.validation";
import { HealthModule } from "./modules/health/health.module";
import { StudiosModule } from "./modules/studios/studios.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    StudiosModule,
  ],
  providers: [StManagerNestLoggerService, { provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
