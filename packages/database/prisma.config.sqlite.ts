// Prisma config for the SQLite (local-dev / future-desktop preparation)
// datasource. Used explicitly via `--config prisma.config.sqlite.ts` since
// this package maintains two datasources (see prisma.config.postgresql.ts).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/sqlite/schema.prisma",
  migrations: {
    path: "prisma/sqlite/migrations",
  },
  datasource: {
    url: process.env["SQLITE_URL"],
  },
});
