import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient as SqlitePrismaClient } from "./generated/sqlite/client";

/**
 * SQLite-backed Prisma Client — the development/test-provider client (ADR
 * 0001: PostgreSQL is the production provider, SQLite is for local API
 * development). `apps/api` selects this client at runtime when
 * `NODE_ENV !== "production"`.
 *
 * Unlike `client.ts`, this is not cached on globalThis: each caller gets its
 * own client instance backed by the same on-disk database file.
 */
export function createSqlitePrismaClient(): SqlitePrismaClient {
  const rawUrl = process.env["SQLITE_URL"];

  if (!rawUrl) {
    throw new Error(
      "SQLITE_URL is not set. Copy packages/database/.env.example to .env and configure a SQLite file path.",
    );
  }

  const adapter = new PrismaBetterSqlite3({ url: resolveSqliteUrl(rawUrl) });

  return new SqlitePrismaClient({ adapter });
}

/**
 * A relative `file:` URL in `SQLITE_URL` is written relative to
 * `packages/database` (matching its own `.env.example`), not relative to
 * whichever process/working directory imports this module (e.g.
 * `apps/api`). Resolve relative paths against this package's own directory
 * so the same `SQLITE_URL` value works for every consumer regardless of
 * their CWD. Absolute paths and `:memory:` are passed through unchanged.
 */
function resolveSqliteUrl(rawUrl: string): string {
  if (rawUrl === ":memory:") {
    return rawUrl;
  }

  const rawPath = rawUrl.replace(/^file:/, "");

  if (path.isAbsolute(rawPath)) {
    return rawUrl;
  }

  // __dirname is the compiled package's own dist/ directory at runtime.
  const absolutePath = path.resolve(__dirname, "..", rawPath);

  return `file:${absolutePath}`;
}

export type { SqlitePrismaClient };
