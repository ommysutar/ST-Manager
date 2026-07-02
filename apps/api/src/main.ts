import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@st-manager/validation";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<ApiEnv, true>);
  const port = configService.get("API_PORT", { infer: true });

  await app.listen(port);

  Logger.log(`ST Manager API listening on http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
