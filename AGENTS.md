# AGENTS

## Cursor Cloud specific instructions

ST Manager is a pnpm + Turborepo monorepo. For local development the two services that matter are:

| Service | Package | Dev command | URL |
|---------|---------|-------------|-----|
| API (NestJS) | `apps/api` | `pnpm --filter @st-manager/api dev` | http://localhost:4000 |
| Web portal (Next.js) | `apps/web` | `pnpm --filter @st-manager/web dev` | http://localhost:3000 |

`pnpm dev` (repo root) runs both together (`turbo run dev --filter=@st-manager/api --filter=@st-manager/web`). The desktop app (`apps/desktop`, Tauri) is not part of the default dev scope and needs a native Linux GUI toolchain to run — leave it out unless specifically asked.

Standard scripts live in the root and per-package `package.json` and READMEs (`pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build`); prefer those over re-deriving commands.

Non-obvious caveats:

- Dev/test use the **SQLite** Prisma datasource (`NODE_ENV=development`); PostgreSQL is only used when `NODE_ENV=production`, so no Postgres server is needed for local dev.
- The API loads env from `apps/api/.env` and the database package loads `packages/database/.env` (both gitignored). They must define `SQLITE_URL="file:./prisma/sqlite/dev.db"` (resolved relative to `packages/database`, regardless of the process CWD) and the API needs `AUTH_SECRET` of at least 32 chars. Copy from the respective `.env.example` files. Use `EMAIL_PROVIDER=console` and `AI_PROVIDER=mock` in dev so no external API keys are required.
- The API (NestJS) imports shared packages from their built `dist/` output, so after changing any `packages/*` source you must rebuild them (`pnpm build`, or `pnpm --filter <pkg> build`) before the API picks up the change. The web dev server (Turbopack) aliases those same packages to their `src/`, so it does **not** need a build.
- The SQLite dev database must be migrated and seeded before the API can serve data: `cd packages/database && pnpm exec prisma migrate deploy --config prisma.config.sqlite.ts && pnpm run db:seed:dev`. Seeded dev logins (password `devpassword`): `owner@st-manager.local`, `assistant@st-manager.local`, `engineer@st-manager.local`, `dev@st-manager.local`.
- In dev the web portal talks to the API through Next.js rewrites at `/api/*` → `http://localhost:4000` (see `apps/web/next.config.ts`), not directly.
- `pnpm lint` currently reports pre-existing errors in `apps/api/scripts/*.mjs` (smoke-test scripts) and `packages/ui/src/components/ui/textarea.tsx`. These are pre-existing code issues, not environment problems. Also note: running `pnpm build` generates gitignored artifacts under `apps/web/out` and `apps/web/public` that ESLint does not ignore — remove them (`git clean -fdX apps/web/out apps/web/public`) before linting or they add thousands of spurious errors.
