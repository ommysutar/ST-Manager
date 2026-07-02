# M3 Implementation Report — NestJS API Bootstrap

- Status: Implemented, validated, **not committed** (awaiting review per instructions)
- Base commit: `c48f8bae9f32fcdf266a457d27046335543a4ce7` (M2 — "feat(database): implement Prisma 7 database layer")
- Date: 2026-07-02
- Scope: `apps/api` NestJS bootstrap only. No business logic, no auth, no AI, no offline sync.

## 1. Executive Summary

`apps/api` is now a real, runnable NestJS application. It boots via `@nestjs/cli`, validates its environment with a shared Zod schema through `ConfigService` (never reading `process.env` directly), and exposes a single `GET /health` endpoint returning `status`, `service`, `version`, `uptime`, and `timestamp`. A `PrismaService` selects between the PostgreSQL client (production) and the SQLite client (development/test) from `@st-manager/database` at startup, without ever calling `.$connect()` or performing any I/O — confirmed empirically by running the compiled app in both modes.

Three real defects in the M2 database layer were discovered while wiring this up (not during M2's own validation, because M2 never actually executed the compiled output — only `tsc`/`prisma` CLI commands). All three were required to make M3 work at all and are described in detail in §5. All decisions in the user's approval message were applied as specified; §7 confirms each one individually.

## 2. Files Created

**`apps/api/src/`** (all new):
- `main.ts` — bootstrap; creates the Nest app, reads `API_PORT` via `ConfigService`, listens.
- `app.module.ts` — root module; wires `ConfigModule` (global, validated), `PrismaModule`, `HealthModule`.
- `config/env.validation.ts` — `validate` function passed to `ConfigModule.forRoot()`; parses the injected config object with `apiEnvSchema` from `@st-manager/validation` and throws a readable error on failure. Never touches `process.env` itself — Nest hands it the raw config object.
- `config/app.constants.ts` — `SERVICE_NAME` / `SERVICE_VERSION` constants for the health payload (see §6 for why this isn't a `package.json` import).
- `common/prisma/prisma.module.ts` — `@Global()` module exporting `PrismaService`.
- `common/prisma/prisma.service.ts` — selects and holds the active-environment Prisma client.
- `modules/health/health.module.ts`, `modules/health/health.controller.ts` — the `GET /health` endpoint.

**`apps/api/` root** (new):
- `nest-cli.json` — points `@nestjs/cli` at the existing `tsconfig.json` (no separate `tsconfig.build.json`).
- `.env.example` — template for `NODE_ENV`, `API_PORT`, `DATABASE_URL`, `SQLITE_URL`.
- `.env` — local values (gitignored via the existing root `.env` pattern), used for the manual validation runs in §8.

**`packages/validation/src/env/api-env.schema.ts`** (new) — `apiEnvSchema` (Zod), conditionally requiring `DATABASE_URL` when `NODE_ENV=production` and `SQLITE_URL` otherwise.

**`.npmrc`** (new, repo root) — pins `store-dir=.pnpm-store`. Needed because `pnpm add` failed with `ERR_PNPM_UNEXPECTED_STORE` against the global store; without this, dependency installs are not reproducible in this sandboxed environment.

## 3. Existing Files Modified

| File | Change | Why |
|---|---|---|
| `apps/api/package.json` | Added `@nestjs/{core,common,platform-express,config}`, `reflect-metadata`, `rxjs`, `@st-manager/{database,validation}` as deps; `@nestjs/{cli,schematics}` as devDeps; `build`/`dev`/`start`/`start:prod` scripts using `nest build` / `nest start --watch` / `nest start` / `node dist/main.js` | Decision 1: use `@nestjs/cli`, not `tsx watch`. |
| `packages/validation/src/index.ts` | Export `apiEnvSchema` / `ApiEnv` | Make the new schema public. |
| `eslint.config.mjs` | Added a `files: ["apps/api/**/*.ts"]` block disabling `no-extraneous-class`, `no-empty-object-type`, `consistent-type-imports` | Decorator-only classes and constructor-injected value imports are normal, correct NestJS patterns that these generic rules flag; see §5.4. |
| `packages/config-eslint/nestjs.mjs` | Added `"@typescript-eslint/consistent-type-imports": "off"` alongside the two rules already disabled there | Keep the framework-preset (source of truth) in sync with the root override; see §5.4. |
| `infra/env/.env.example` | Filled in `API_PORT=4000`, `API_BASE_URL=http://localhost:4000` | These were blank placeholders from the original scaffold; M3 is the first milestone that gives them a concrete value. |
| `packages/config-typescript/nestjs.json` | Added `"ignoreDeprecations": "6.0"` | See §5.1 — required to unblock `nest build` under the pinned TypeScript ~6.0.3 toolchain. |
| `packages/database/tsconfig.json`, `packages/validation/tsconfig.json` | Added `"module": "CommonJS"`, `"moduleResolution": "Node"`, `"ignoreDeprecations": "6.0"` | See §5.2 — the previous ESM output could not be `require()`'d by the CommonJS Nest app. |
| `packages/database/src/client.ts` | `export const prisma` → `export function getPrisma()` (memoized, lazy) | See §5.3 — the old eager, throwing singleton made `apps/api` crash on startup regardless of provider. |
| `packages/database/src/sqlite.ts` | Added `resolveSqliteUrl()`, resolving relative `file:` paths against the package's own directory (`__dirname`) instead of the caller's CWD | See §5.3 — needed for decision 6 (a different app, `apps/api`, now consumes this client). |
| `packages/database/src/index.ts` | `export { prisma }` → `export { getPrisma }`; added `export type { PrismaClient as PostgresPrismaClient }` | Match the renamed function; expose a type `PrismaService` needs for its client union. |
| `packages/database/README.md` | Updated the "Structure" section to describe `getPrisma()` and the SQLite path-resolution behavior | Keep docs accurate after the above fixes. |
| `pnpm-lock.yaml` | Updated by `pnpm add`/`pnpm install` | Dependency additions. |

No other files were touched. `docs/meeting-notes/M2-commit-summary.md` appears as untracked in `git status` but predates this session and was not created or modified as part of M3.

## 4. Dependencies Added (all to `apps/api`)

| Package | Version | Why |
|---|---|---|
| `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` | `^11.1.27` | NestJS runtime + Express HTTP adapter (matches the already-installed `@nestjs/cli` v11 line). |
| `@nestjs/config` | `^4.0.4` | `ConfigModule`/`ConfigService`, required by decision 3. |
| `reflect-metadata` | `^0.2.2` | Required by Nest's decorator metadata (`emitDecoratorMetadata`). |
| `rxjs` | `^7.8.2` | Peer dependency of `@nestjs/core`. |
| `@nestjs/cli`, `@nestjs/schematics` (devDependencies) | `^11.0.23`, `^11.1.0` | Decision 1: the dev/build workflow. |
| `@st-manager/database`, `@st-manager/validation` (workspace) | `workspace:^` | `PrismaService` and the env schema. |

No dependency was added to any other package.

## 5. Issues Found and Fixed During Implementation

These were not anticipated in the M3 plan because M2's own validation never executed the compiled `packages/database` output — it only ran `tsc` and the `prisma` CLI. `apps/api` is the first thing in this repository that actually `require()`s and runs that output, so this is the first point these could surface.

### 5.1 `moduleResolution: "Node"` deprecation error (TS5107)

`nest build` (and `tsc` in general, once real source files exist) failed with `TS5107: Option 'moduleResolution=node10' is deprecated`. This didn't surface earlier because `apps/api`'s `src/` was empty until now (empty-input typechecks short-circuit before hitting this). Fixed by adding `"ignoreDeprecations": "6.0"` to `packages/config-typescript/nestjs.json`, exactly as suggested by the compiler's own error message. Non-invasive: it silences the deprecation warning without changing resolution behavior.

### 5.2 `packages/database` / `packages/validation` were built as ESM but consumed as CommonJS

`packages/database`'s and `packages/validation`'s `tsconfig.json` both extended `base.json`, which compiles with `module: "ESNext"`. Their compiled `dist/index.js` therefore contained plain `export`/`import` syntax with extensionless relative specifiers (e.g. `export { prisma } from "./client"`), but neither package's `package.json` declares `"type": "module"`. When `apps/api` (a CommonJS Nest app, per decision 1's tooling) tried to `require("@st-manager/database")` at runtime, Node detected ESM syntax and attempted its experimental synchronous `require(esm)` path, which failed outright because ESM resolution doesn't do extension-less resolution:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../packages/database/dist/client'
imported from .../packages/database/dist/index.js
```

This was latent since M2 — nothing had ever actually `require()`'d the built output before. Fixed by overriding `module: "CommonJS"` / `moduleResolution: "Node"` in both packages' own `tsconfig.json` (the same override pattern `nestjs.json` already uses), so their `dist/` output is now genuine CommonJS. Confirmed by inspecting the recompiled `dist/index.js` (now uses `require`/`exports.x = ...`) and by the successful runs in §8. `apps/web` and `apps/desktop` are bundler-based (Next.js/Vite) and don't `require()` workspace packages directly, so this doesn't affect them; it will need revisiting if any other future consumer runs workspace packages under plain Node instead of a bundler.

### 5.3 `packages/database`'s PostgreSQL client crashed on import, in every environment

Even after fixing 5.2, the app crashed on startup with `Error: DATABASE_URL is not set`, in **development mode**, despite decision 6 saying SQLite should be used in development. Root cause: `packages/database/src/client.ts` exported `prisma` as a module-level `const`, eagerly constructed (and throwing if `DATABASE_URL` was missing) the moment the module was first loaded. Because `packages/database/src/index.ts` unconditionally `require()`s both `./client` and `./sqlite` to build its barrel exports, simply importing anything from `@st-manager/database` — including only `createSqlitePrismaClient` — triggered `client.ts`'s top-level code and crashed, regardless of which provider was actually wanted.

This is a real defect in M2, not a new M3 requirement: a dual-provider package cannot have one provider's client eagerly self-construct-and-throw at import time, because that makes the package unusable in any environment lacking that provider's env var — even when that provider is never selected. It also worked against decision 4's intent ("keep Prisma lazy") more than the original M2 design acknowledged.

**Fix:** `client.ts` now exports `getPrisma()`, a function that lazily constructs and memoizes the client on first call (same globalThis-caching behavior as before, just deferred). `index.ts` now exports `getPrisma` instead of `prisma`. `PrismaService` only calls `getPrisma()` on the `postgresql` branch, so `DATABASE_URL` is never read, and no PostgreSQL client is ever constructed, in development/test. Verified in §8: development mode boots cleanly with no `DATABASE_URL` required, and production mode (with `NODE_ENV=production`) correctly constructs the PostgreSQL client without attempting a connection.

While fixing this, a related correctness gap in `sqlite.ts` was also fixed: `SQLITE_URL`'s relative `file:` path was being resolved against `process.cwd()` at runtime, which is `packages/database` when Prisma's own CLI runs there, but is `apps/api` when `apps/api` is the one running. The same env value would silently point at the wrong file (or a nonexistent path) depending on which process created the client. Fixed by resolving relative paths against the package's own `__dirname` instead, so the identical `SQLITE_URL=file:./prisma/sqlite/dev.db` value from `packages/database/.env.example` now works unmodified from `apps/api` regardless of its working directory. Verified with a standalone smoke test run from `apps/api`'s directory (§8.4) — it successfully queried the same SQLite database file `packages/database` migrated in M2.

### 5.4 `consistent-type-imports` false positive on DI-injected classes

`ConfigService` is only ever used as a type annotation in `PrismaService`'s constructor parameter (`constructor(configService: ConfigService<ApiEnv, true>)`), which the base ESLint config's `@typescript-eslint/consistent-type-imports` rule (correctly, in general) flags as "should be `import type`". Following that suggestion would break Nest's dependency injection: `emitDecoratorMetadata` needs a **value** import to emit a real class reference in `design:paramtypes`; an `import type` would erase it, and Nest would fail to resolve the provider at runtime. Disabled this rule for `apps/api` only (both in the root override and in `packages/config-eslint/nestjs.mjs`, keeping the two in sync as intended).

## 6. Notable Implementation Decisions

- **`SERVICE_VERSION` is a hardcoded constant (`config/app.constants.ts`), not a `package.json` import.** Every `tsconfig.json` in this repo pins `rootDir: "./src"` (fixed repo-wide in M0/M1 to stop stray build artifacts). `package.json` lives one level above `src/`, so importing it would violate `rootDir` and fail the build (`TS6059`) the same way it did before that fix. The constant is set to `"0.0.0"`, matching every package's current placeholder version; a comment flags it to be kept in sync until a real release process exists.
- **Provider selection is based on `NODE_ENV`** (`production` → PostgreSQL, anything else → SQLite), per decision 6 and consistent with ADR 0001, which already stated PostgreSQL is consumed "for local API development" via SQLite. This is intentionally the simplest possible mapping; a dedicated `DB_PROVIDER` override could be added later if `NODE_ENV` and database-provider choice ever need to vary independently (e.g. a staging environment that's `NODE_ENV=production` but should still use SQLite).
- **`PrismaService.getClient()` returns a union type** (`PostgresPrismaClient | SqlitePrismaClient`) and is not called anywhere yet. Nothing in M3 queries the database — `HealthController` deliberately does not depend on `PrismaService` at all, matching decision 5 (no Terminus / no DB-backed health check) and decision 2 (the health payload doesn't need it). The union type is in place, ready for the first real query in a future milestone, but is unexercised by M3 itself.
- **`@nestjs/schematics` was added** alongside `@nestjs/cli` even though no `nest generate` command was used to create these files (all files were hand-written to match the exact plan). It's included because `nest-cli.json`'s `"collection": "@nestjs/schematics"` is the standard pairing, and every NestJS project this CLI version generates expects it to be present.

## 7. Confirmation of Each Requested Architectural Decision

1. **`@nestjs/cli` instead of `tsx watch`** — done. `dev` runs `nest start --watch`; `build` runs `nest build`; `nest-cli.json` added.
2. **Health endpoint fields** — done, exact shape verified in §8: `status`, `service`, `version`, `uptime`, `timestamp`.
3. **`ConfigService` everywhere, never `process.env` directly** — done. `main.ts` reads `API_PORT` via `configService.get(...)`. `env.validation.ts` receives its config object as a function parameter from Nest (never touches `process.env` itself). `PrismaService` reads `NODE_ENV` via `ConfigService`. The only `process.env` reads left anywhere in the new/touched code are inside `packages/database` (a plain Node package with no Nest DI, established in M2, out of scope for this rule) and `process.uptime()` in the health controller (a different global, not `process.env`).
4. **Prisma stays lazy, no `.$connect()` during bootstrap** — done and now more robustly true than the M2 baseline (see §5.3). Verified empirically in both dev and prod modes in §8: the app fully boots and serves `/health` with no database reachable at all.
5. **Terminus stays out of M3** — done; `@nestjs/terminus` was not installed, and `HealthController` doesn't depend on it or on `PrismaService`.
6. **PostgreSQL = production, SQLite = development** — done. `PrismaService` selects the provider from `NODE_ENV`. Verified in §8 that both branches boot correctly and select the expected provider.
7. **Frozen architecture unchanged** — no new packages, apps, or folders were added; no technology in the approved stack was swapped. All modifications to already-committed M2/M0/M1 files are build-configuration and correctness fixes (§5), not architectural changes, and are called out explicitly above rather than folded in silently.

## 8. Validation

All commands run from the repo root unless noted.

### 8.1 Install / build / typecheck / lint

```bash
pnpm install         # Already up to date (after `pnpm add` for the new deps)
pnpm build            # 6/6 tasks successful (turbo)
pnpm --filter @st-manager/api --filter @st-manager/database --filter @st-manager/validation run typecheck
                      # all three: Done, 0 errors
pnpm lint             # 0 errors, 0 warnings
```

`pnpm typecheck` at the root still fails — but only on `apps/desktop`, `apps/web`, and `packages/storage` (`TS18003: No inputs were found`), the same pre-existing empty-`src/` condition documented in the M0/M1 and M2 reports. None of these three packages were touched by M3.

### 8.2 Runtime — development mode (SQLite provider)

Ran `pnpm --filter @st-manager/api run dev` (`nest start --watch`), then:

```bash
$ curl -s http://localhost:4000/health
{"status":"ok","service":"st-manager-api","version":"0.0.0","uptime":20.04,"timestamp":"2026-07-02T15:24:17.149Z"}
```

Startup log confirmed: `[PrismaService] Using "sqlite" Prisma client for NODE_ENV="development" (lazy — no connection opened yet).` No `DATABASE_URL` was required or read.

### 8.3 Runtime — production mode (PostgreSQL provider, no live database)

Ran `NODE_ENV=production API_PORT=4001 node dist/main.js` directly (no `docker`/live PostgreSQL available in this environment):

```bash
$ curl -s http://localhost:4001/health
{"status":"ok","service":"st-manager-api","version":"0.0.0","uptime":15.08,"timestamp":"2026-07-02T15:24:55.226Z"}
```

Startup log confirmed: `[PrismaService] Using "postgresql" Prisma client for NODE_ENV="production" (lazy — no connection opened yet).` The app started and served traffic successfully with no reachable PostgreSQL instance, confirming decision 4 (no connection attempted during bootstrap).

### 8.4 Env validation failure path

Ran with `SQLITE_URL` unset and `NODE_ENV=development`:

```
Error: Invalid environment configuration:
  - SQLITE_URL: Too small: expected string to have >=1 characters
  - SQLITE_URL: SQLITE_URL is required when NODE_ENV is not production (SQLite is the development/test provider).
```

Fails fast with a readable message at `ConfigModule.forRoot()`, before the HTTP server starts.

### 8.5 SQLite cross-package path resolution smoke test

Ran a standalone script from `apps/api`'s own working directory (not `packages/database`'s), using the identical `SQLITE_URL=file:./prisma/sqlite/dev.db` value from `packages/database/.env.example`:

```bash
$ cd apps/api && SQLITE_URL="file:./prisma/sqlite/dev.db" node -e "... client.studio.findMany() ..."
OK, query succeeded from apps/api CWD. Row count: 0
```

This confirms the same env value correctly resolves to `packages/database/prisma/sqlite/dev.db` (the M2-migrated database) regardless of which app's directory the process runs from, and that the `studios` table (migrated in M2, still empty) is genuinely reachable.

## 9. Risks and Remaining Issues

- **No automated tests exist yet** for `apps/api` (no test runner is configured anywhere in the repo yet). All validation in §8 is manual (build/typecheck/lint plus live curl checks). A test milestone should formalize this.
- **PostgreSQL path is still unverified against a real PostgreSQL instance** (same limitation carried over from M2 — no Docker/Postgres available in this sandbox). §8.3 only proves the app doesn't crash or attempt a premature connection; it does not prove a real query against PostgreSQL succeeds.
- **`NODE_ENV`-based provider selection is coarse.** If a future environment needs `NODE_ENV=production` semantics (e.g. minification, prod logging) while still targeting SQLite, or vice versa, the current logic can't express that. Flagged in §6 as a candidate follow-up (`DB_PROVIDER` override), not implemented now to keep M3 minimal.
- **The ESM/CommonJS fix (§5.2) is scoped only to the two packages `apps/api` currently imports.** Any other shared package that a future plain-Node (non-bundler) consumer needs to `require()` at runtime will need the same `tsconfig.json` override.
- **`docs/meeting-notes/M2-commit-summary.md` is untracked in git**, predating this session. Not part of M3; flagged here only so it isn't mistaken for an M3 artifact.

## 10. Next Recommended Milestone

Per the Phase 2 roadmap, **M4** (or the roadmap's next-numbered milestone covering the first real `Studio` CRUD vertical slice) is the natural next step: a `StudiosModule` in `apps/api` using `PrismaService.getClient()` against the `Studio` model, backed by `packages/validation`'s existing `createStudioSchema`. This is the first milestone that will actually exercise `PrismaService` beyond construction, and will be the first real test of the PostgreSQL path once a live database is available.

Stopping here per instructions — no commit has been made. `git status` still shows all M3 changes as modified/untracked, exactly as listed in §2–§3.
