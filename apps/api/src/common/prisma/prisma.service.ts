import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createSqlitePrismaClient,
  getPrisma,
  type PostgresPrismaClient,
  type SqlitePrismaClient,
} from "@st-manager/database";
import type { ApiEnv } from "@st-manager/validation";

export type DatabaseProvider = "postgresql" | "sqlite";
export type DatabaseClient = PostgresPrismaClient | SqlitePrismaClient;

/**
 * Selects and holds the Prisma client for the active environment: PostgreSQL
 * in production, SQLite in development/test (ADR 0001 + M3 decision 6).
 *
 * Both `getPrisma()` and `createSqlitePrismaClient()` only construct their
 * driver adapter and client objects — neither opens a real database
 * connection. Prisma connects lazily on first query, and nothing here calls
 * `$connect()` explicitly, so no connection is attempted during bootstrap
 * (M3 decision 4). `getPrisma()` is only called for the postgresql branch, so
 * `DATABASE_URL` is never required in development/test.
 */
@Injectable()
export class PrismaService {
  private readonly logger = new Logger(PrismaService.name);

  readonly provider: DatabaseProvider;
  private readonly client: DatabaseClient;

  constructor(configService: ConfigService<ApiEnv, true>) {
    const nodeEnv = configService.get("NODE_ENV", { infer: true });

    this.provider = nodeEnv === "production" ? "postgresql" : "sqlite";
    this.client = this.provider === "postgresql" ? getPrisma() : createSqlitePrismaClient();

    this.logger.log(
      `Using "${this.provider}" Prisma client for NODE_ENV="${nodeEnv}" (lazy — no connection opened yet).`,
    );
  }

  getClient(): DatabaseClient {
    return this.client;
  }
}
