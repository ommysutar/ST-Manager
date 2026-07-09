import "reflect-metadata";

import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@st-manager/validation";

import { AppModule } from "./app.module";
import { StManagerNestLoggerService } from "./common/logging/st-manager-nest-logger.service";

/** Origins used by the Tauri desktop WebView when loading bundled local assets. */
const DESKTOP_CORS_ORIGINS = new Set([
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "http://asset.localhost",
  "https://asset.localhost",
  "http://localhost",
  "http://127.0.0.1",
]);

function isDesktopCorsOrigin(origin: string): boolean {
  return DESKTOP_CORS_ORIGINS.has(origin) || origin.startsWith("tauri://");
}

function isLocalDevCorsOrigin(origin: string): boolean {
  return (
    isDesktopCorsOrigin(origin) ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("https://localhost:") ||
    origin.startsWith("https://127.0.0.1:")
  );
}

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
      // Tauri/WebView requests may omit the Origin header.
      if (!requestOrigin) {
        callback(null, true);
        return;
      }

      if (isDesktopCorsOrigin(requestOrigin)) {
        callback(null, true);
        return;
      }

      if (nodeEnv !== "production") {
        const isAllowed = isLocalDevCorsOrigin(requestOrigin);
        callback(isAllowed ? null : new Error("Blocked by CORS"), isAllowed);
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
