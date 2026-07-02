import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/postgresql/client";

/**
 * PostgreSQL-backed Prisma Client — the primary/production database client
 * for ST Manager, consumed by apps/api (see ADR 0001). Requires DATABASE_URL
 * to point at a reachable PostgreSQL instance.
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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
