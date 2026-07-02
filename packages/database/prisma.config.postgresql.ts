// Prisma config for the PostgreSQL (primary/production) datasource.
// Used explicitly via `--config prisma.config.postgresql.ts` since this
// package maintains two datasources (see prisma.config.sqlite.ts).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/postgresql/schema.prisma",
  migrations: {
    path: "prisma/postgresql/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
