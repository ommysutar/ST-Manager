import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient as SqlitePrismaClient } from "./generated/sqlite/client";

/**
 * SQLite-backed Prisma Client — local-development / future-desktop
 * preparation only (ADR 0001 defers real desktop-embedded SQLite usage to
 * milestone M11). Not imported by any app yet; kept here so the SQLite path
 * is real, generated, and verifiable ahead of that milestone.
 *
 * Unlike `client.ts`, this is not cached on globalThis: it is not intended
 * to be used as a long-lived singleton by a running service yet.
 */
export function createSqlitePrismaClient(): SqlitePrismaClient {
  const url = process.env["SQLITE_URL"];

  if (!url) {
    throw new Error(
      "SQLITE_URL is not set. Copy packages/database/.env.example to .env and configure a SQLite file path.",
    );
  }

  const adapter = new PrismaBetterSqlite3({ url });

  return new SqlitePrismaClient({ adapter });
}

export type { SqlitePrismaClient };
