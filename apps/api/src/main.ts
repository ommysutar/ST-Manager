import "reflect-metadata";

import helmet from "helmet";
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
  const nodeEnv = configService.get("NODE_ENV", { infer: true });
  const port = configService.get("API_PORT", { infer: true });
  const corsOrigin = configService.get("CORS_ORIGIN", { infer: true });
  const allowedOrigins = corsOrigin
    ? corsOrigin
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : [];

  app.use(helmet());
  app.enableCors({
    credentials: true,
    origin: (
      requestOrigin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }

      if (nodeEnv !== "production") {
        const isLocalOrigin =
          requestOrigin.startsWith("http://localhost:") ||
          requestOrigin.startsWith("http://127.0.0.1:") ||
          requestOrigin.startsWith("https://localhost:") ||
          requestOrigin.startsWith("https://127.0.0.1:");

        callback(isLocalOrigin ? null : new Error("Blocked by CORS"), isLocalOrigin);
        return;
      }

      const isAllowed = allowedOrigins.includes(requestOrigin);
      callback(isAllowed ? null : new Error("Blocked by CORS"), isAllowed);
    },
  });

  await app.listen(port);

  logger.log(`ST Manager API listening on http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
