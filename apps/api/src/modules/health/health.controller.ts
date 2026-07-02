import { Controller, Get } from "@nestjs/common";

import { SERVICE_NAME, SERVICE_VERSION } from "../../config/app.constants";

export interface HealthCheckResponse {
  status: "ok";
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
}

/**
 * Liveness endpoint only — deliberately does not touch `PrismaService` or
 * any database. `@nestjs/terminus` is intentionally out of scope for M3.
 */
@Controller("health")
export class HealthController {
  @Get()
  check(): HealthCheckResponse {
    return {
      status: "ok",
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
