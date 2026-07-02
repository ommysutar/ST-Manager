import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/postgresql/client";

/**
 * PostgreSQL-backed Prisma Client — the production-provider database client
 * for ST Manager (see ADR 0001 and the M3 implementation report). Requires
 * DATABASE_URL to point at a reachable PostgreSQL instance.
 *
 * Cached on globalThis in non-production environments to avoid exhausting
 * database connections when Nest's watch mode hot-reloads this module.
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env["DATABASE_URL"];

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy packages/database/.env.example to .env and configure a PostgreSQL connection string.",
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env["NODE_ENV"] === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Lazily constructs (and memoizes) the PostgreSQL Prisma Client.
 *
 * This is a function rather than a module-level constant so that merely
 * importing `@st-manager/database` — or requesting the SQLite client via
 * `createSqlitePrismaClient()` — never constructs the PostgreSQL client or
 * requires `DATABASE_URL` to be set. That matters because consumers like
 * `apps/api` select a provider at runtime based on `NODE_ENV` (M3 decision
 * 6): in development/test, `DATABASE_URL` is never read at all, so it must
 * not be validated eagerly at module-load time.
 */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();

  if (process.env["NODE_ENV"] !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}
