import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@st-manager/validation";

import { AppModule } from "./app.module";
import { StManagerNestLoggerService } from "./common/logging/st-manager-nest-logger.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(StManagerNestLoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService<ApiEnv, true>);
  const port = configService.get("API_PORT", { infer: true });

  await app.listen(port);

  logger.log(`ST Manager API listening on http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
