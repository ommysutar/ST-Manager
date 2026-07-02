# M2 Planning Report — Database Layer Bootstrap

- Date: 2026-07-02
- Milestone: M2 (Database Layer Bootstrap)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md), [ADR 0001](../system-architecture/adr/0001-desktop-local-data-access-strategy.md), [ADR 0002](../system-architecture/adr/0002-authentication-provider.md)
- Status: **Planning only — no database code has been generated.** Awaiting approval before implementation.

## 1. Review of Existing ADRs and Architecture

### ADR 0001 — Desktop Local Data Access Strategy

Decision: the desktop app is **online-only** through milestone M7 (calls `apps/api` over HTTP via `packages/api-sdk`, no local SQLite). The Rust-native-SQLite vs. Node-sidecar question for true offline support is explicitly deferred to M11. Consequence relevant to M2: **`packages/database`'s Prisma schema is, for now, only consumed by `apps/api` against PostgreSQL** (plus SQLite for local API development convenience). It is *not* consumed directly by `apps/desktop` yet. This significantly simplifies M2's scope — M2 does not need to solve "Prisma running inside a Tauri app," only "Prisma running inside a NestJS process, against two possible database engines depending on environment."

### ADR 0002 — Authentication Provider

Deferred to M10. No impact on the M2 schema itself, except that the `Studio` model should **not** yet include owner/user foreign keys, since there is no `User`/`Account` model and no auth boundary to attach one to. Any ownership/tenancy fields are out of scope for M2.

### Frozen v3 Architecture (recap, from `packages/database/README.md`)

> Single source of truth for the data layer: Prisma schema, migrations, and a typed client export. Supports PostgreSQL (production/API) and SQLite (desktop embedded/local) providers.

The architecture commits to **both** providers existing long-term, but ADR 0001 clarifies the SQLite provider is not urgently needed until M11. M2 should build the PostgreSQL path for real (since `apps/api` needs it at M3), and *prepare* — but not necessarily fully wire — the SQLite path, per the recommendation below.

### Current repository state

- `packages/database/prisma/` contains only a placeholder `README.md` and an empty `migrations/.gitkeep` — no `schema.prisma` exists yet, Prisma has never been initialized.
- `packages/database/src/` is empty (`.gitkeep` only).
- `packages/types/src/studio.ts` already defines the target shape to mirror: `{ id: string; name: string; createdAt: Date; updatedAt: Date }`.
- `packages/validation/src/studio/studio.schema.ts` already defines `createStudioSchema` (Zod) validating `{ name: string (1-120 chars, trimmed) }` — this is the *input* shape for creation; `id`/`createdAt`/`updatedAt` are server/database-generated and correctly excluded from it.
- `packages/constants/src/routes.ts` already defines `ROUTES.STUDIOS = "studios"`, confirming `Studio` as the first resource end-to-end.

No conflicts found between existing M1 output and the proposed M2 schema below.

## 2. Prisma Strategy

**Prisma ORM** (schema + migrate + generated client), scoped entirely to `packages/database`, consumed by `apps/api` only (per ADR 0001).

Key decisions:

- **Single `packages/database` package, one `schema.prisma` file for now** (not two), using an **environment-variable-driven datasource** rather than provider-specific schema files. Prisma's `datasource` block supports `provider = env("DATABASE_PROVIDER")` is *not* valid (the `provider` field must be a static string literal, not an env-resolved one) — this is a real Prisma constraint that must be designed around. See §5 (Dual-Provider Architecture) for how this is resolved.
- **Client generation**: standard `prisma generate` producing `@prisma/client` into `packages/database`'s own `node_modules` (default output location), re-exported via `packages/database/src/index.ts` as a typed singleton (`getPrismaClient()` / a lazily-instantiated `prisma` export), following the well-known "Prisma Client singleton in serverless/dev environments" pattern to avoid exhausting connections under `ts-node`/Nest's watch-mode hot reload.
- **No Prisma Studio, no seed data, no migrations executed** as part of M2 planning — those are implementation-phase activities, listed in §8.
- **Version**: latest stable Prisma 6.x line (exact patch version to be pinned at implementation time via `pnpm add`, not hardcoded in this plan).

## 3. SQLite Strategy

Per ADR 0001, SQLite is **not urgently required** for M2's actual consumer (`apps/api` targets PostgreSQL first at M3). However, SQLite has two legitimate near-term uses worth planning for now:

1. **Local API development without a running PostgreSQL instance** — a contributor should be able to run `apps/api` locally against a zero-install SQLite file for quick iteration, matching many Prisma-based project conventions.
2. **Future desktop embedding (M11)** — not implemented in M2, but the schema should avoid PostgreSQL-only column types/features that would block a future SQLite-compatible schema variant.

SQLite-specific constraints that shape the M2 schema (see §5):

- SQLite has no native `UUID` type — IDs will be stored as `TEXT`, generated application-side (Prisma's `cuid()`/`uuid()` default functions work identically across both providers since they're generated in the Prisma Client, not the database).
- SQLite has no native timezone-aware `TIMESTAMPTZ` — Prisma maps `DateTime` to SQLite's `DATETIME` (stored as ISO 8601 text), which is sufficient for the `Studio` model's `createdAt`/`updatedAt` fields with no loss of fidelity for this milestone.
- SQLite does not support `@db.VarChar(n)` length-enforcement natively the way PostgreSQL does; Prisma will silently ignore PostgreSQL-specific native type attributes when generating against the `sqlite` provider if such attributes are present in a shared schema — this is one of the concrete reasons a truly *unified* single-provider-agnostic schema has limits, informing the dual-file recommendation in §5.

## 4. PostgreSQL Strategy

PostgreSQL is the **primary, production target**, consumed by `apps/api`.

- Connection via standard `DATABASE_URL` (`postgresql://user:pass@host:port/db?schema=public`), sourced from `infra/env/.env.example` (already scaffolded with a placeholder `DATABASE_URL=` entry).
- Local development PostgreSQL instance via `infra/docker/docker-compose.yml` (not yet created — in scope for M2 implementation, not M3, since the database layer should be runnable in isolation).
- Native PostgreSQL types to leverage where it matters even at this early stage: `TIMESTAMPTZ` semantics via Prisma's `DateTime` (Prisma defaults to timestamp with time zone on PostgreSQL, which is correct and requires no extra annotation).
- Migrations authored and applied via `prisma migrate dev` against Postgres as the primary migration history (see §6).

## 5. Dual-Provider Architecture

This is the central open technical question flagged by ADR 0001 and the roadmap. Prisma fundamentally requires **one static `provider` value per schema file** — there is no supported way to make a single `schema.prisma` + single generated client transparently target both `sqlite` and `postgresql` at runtime via an environment variable alone. Three real options exist:

### Option A — Two schema files, two generated clients (roadmap's original suggestion)

- `packages/database/prisma/schema.postgresql.prisma` and `schema.sqlite.prisma`, each with identical models but a different `datasource` block and a different `generator` `output` path (e.g. `../src/generated/postgresql` and `../src/generated/sqlite`).
- `packages/database/src/index.ts` picks which generated client to re-export based on an environment variable at *module load time* (e.g. `DB_PROVIDER=postgresql|sqlite`).
- **Pro**: fully accurate per-provider typings and native features (e.g. could later use PostgreSQL-only column types without breaking SQLite).
- **Con**: two schema files to keep in sync by hand; a script or `package.json` `pretest`/`predev` hook is needed to regenerate whichever client is active; doubles migration history bookkeeping if not careful (mitigated by §6).

### Option B — Single schema file, environment-swapped `provider` via a pre-generate script

- One `schema.prisma` with a placeholder (e.g. `provider = "postgresql"` checked into git as the default), and a small Node/shell script (`tooling/scripts/db-generate.sh`) that temporarily rewrites the `provider` line based on `DB_PROVIDER` before invoking `prisma generate`, then restores it.
- **Pro**: single file, no drift between two schemas by construction.
- **Con**: fragile (text-rewriting a config file before every generate), unusual pattern that will confuse new contributors, harder to reason about in CI.

### Option C — PostgreSQL-only Prisma schema; SQLite deferred entirely to M11 under a different mechanism

- Accept ADR 0001's framing fully: since SQLite isn't consumed by anything until M11, and M11 may end up choosing Rust-native SQLite (`rusqlite`) instead of Prisma-on-SQLite anyway (ADR 0001's stated "current lead candidate"), **don't build Prisma/SQLite dual-provider support in M2 at all.** Ship a single PostgreSQL-only `schema.prisma`. Local dev without Docker Postgres is solved separately (e.g. a lightweight `docker-compose` one-liner, or documenting a free-tier hosted Postgres for contributors), not via SQLite.
- **Pro**: zero speculative complexity; matches the "smallest vertical slice" philosophy already used for M0/M1 and the desktop-online-only decision; avoids building Option A/B machinery that may be thrown away if M11 picks Rust-native SQLite anyway.
- **Con**: contributors need Docker (or a hosted Postgres) to run `apps/api` locally from day one; the `packages/database` README's "Supports PostgreSQL and SQLite" claim would need a caveat until M11.

## 6. Studio Schema

Target Prisma model, mirroring `packages/types/src/studio.ts` exactly (no fields added beyond what M1 already committed to):

```prisma
model Studio {
  id        String   @id @default(cuid())
  name      String   @db.VarChar(120)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("studios")
}
```

Notes:

- `@default(cuid())` generates collision-resistant string IDs application-side — works identically on both PostgreSQL and SQLite, satisfying the `id: string` type in `packages/types`.
- `@db.VarChar(120)` matches `createStudioSchema`'s `.max(120)` constraint in `packages/validation`, enforcing the same limit at the database layer as defense-in-depth (this attribute is PostgreSQL-specific; under Option A it would simply be omitted/ignored in the SQLite variant, under Option C it's unconditionally safe).
- `@@map("studios")` keeps the SQL table name aligned with `ROUTES.STUDIOS = "studios"` from `packages/constants`, for consistency between the API route, the constant, and the table name.
- No `slug` column: `slugifyStudioName` (from `packages/utils`) is a presentation-layer derivation, not stored data, for M2. Revisit only if uniqueness/routing requirements demand a persisted, indexed slug later.
- No owner/tenant/user foreign key (per ADR 0002 — no auth model exists yet).

## 7. Migration Strategy

- Use `prisma migrate dev --name init` to generate the first migration against the primary provider (PostgreSQL, per §5 recommendation) — this is a **local, interactive** command that both creates the SQL migration file and applies it to a local dev database.
- Commit the generated SQL under `packages/database/prisma/migrations/<timestamp>_init/migration.sql` (the currently-empty `migrations/.gitkeep` placeholder will be removed once real migrations exist, consistent with how M1 removed `.gitkeep` files upon adding real source).
- For CI/production, use `prisma migrate deploy` (non-interactive, applies pending migrations only, no schema-drift prompts) — this is a **future M13 (CI/CD)** concern to wire into a pipeline, but the migration files produced in M2 are what that pipeline will consume.
- If Option C (§5) is adopted, there is exactly one migration history to maintain. If Option A is adopted instead, two independent migration histories must be generated and kept in step manually for every future schema change — a maintenance cost that recurs on every milestone touching the schema (M5 onward), not just once.

## 8. Repository Structure

Proposed structure inside the already-scaffolded `packages/database/`:

```
packages/database/
├── prisma/
│   ├── schema.prisma            # single schema (Option C) — see §5/§9
│   ├── migrations/
│   │   └── <timestamp>_init/
│   │       └── migration.sql
│   └── seed.ts                  # minimal seed (optional for M2; empty/no-op acceptable)
├── src/
│   ├── client.ts                 # PrismaClient singleton (dev hot-reload safe)
│   └── index.ts                  # public exports: `prisma`, re-exported generated types
├── package.json                  # add prisma + @prisma/client deps, db:generate/db:migrate scripts
└── tsconfig.json                 # unchanged (already fixed in M1 rootDir work)
```

If Option A is chosen instead of Option C, `prisma/` would instead contain `schema.postgresql.prisma` + `schema.sqlite.prisma` (no single `schema.prisma`), and `src/client.ts` would branch on `process.env.DB_PROVIDER` to import from the correct generated output path.

New root/workspace-level additions needed to support M2 regardless of Option chosen:
- `infra/docker/docker-compose.yml` — local PostgreSQL service (currently only `.gitkeep` exists in `infra/docker/`).
- `infra/env/.env.example` already has a `DATABASE_URL=` placeholder (from scaffolding) — needs a real example value filled in (e.g. `postgresql://postgres:postgres@localhost:5432/st_manager?schema=public`).
- `package.json` (root) — no changes expected; per-package `db:*` scripts live in `packages/database/package.json` and are invoked via `pnpm --filter @st-manager/database`.

## 9. Recommended Implementation

**Recommend Option C** (§5): PostgreSQL-only Prisma schema for M2, with SQLite deferred to M11.

Rationale:

1. **Consistency with ADR 0001's own logic.** ADR 0001 already deferred the hard offline/SQLite problem past M7 specifically to keep milestones small and avoid speculative infrastructure. Building a dual-schema Prisma setup in M2 — for a SQLite path that ADR 0001 itself says may not even use Prisma at M11 (Rust-native SQLite is the "current lead candidate") — would be exactly the kind of speculative complexity the roadmap's "walking skeleton first" principle warns against.
2. **Lower maintenance cost through M5.** Every schema change between M2 and M11 (at minimum, whatever M5's "Studio API Feature Module" needs, plus any model added for other resources before M11) would otherwise need to be authored and migrated twice under Option A, or require the fragile rewrite script of Option B, for a consumer (`apps/desktop`) that isn't using it yet.
3. **Local dev without SQLite is a solved problem.** A `docker-compose.yml` with a PostgreSQL service (already an explicitly scaffolded `infra/docker/` folder) is a one-command local dependency (`docker compose up -d`), which is a reasonable ask for a NestJS/Prisma project and is what most production Prisma+Postgres projects do anyway.
4. **Does not foreclose Option A later.** If M11's ADR follow-up decides desktop *should* run Prisma-on-SQLite (Option 2 from ADR 0001, the non-lead candidate), the `Studio` model defined here has no PostgreSQL-only native types that would block adding a second `schema.sqlite.prisma` at that point — the migration effort would be additive, not a rewrite.

**Concrete implementation steps for M2** (not executed in this planning report):

1. Add `prisma` (dev dependency) and `@prisma/client` (dependency) to `packages/database/package.json`.
2. `prisma init` targeting `postgresql`, producing `packages/database/prisma/schema.prisma`.
3. Author the `Studio` model exactly as specified in §6.
4. Add `infra/docker/docker-compose.yml` with a `postgres:16`-class service, matching the `DATABASE_URL` convention in `infra/env/.env.example`.
5. Run `prisma migrate dev --name init` locally against that Docker Postgres instance; commit the resulting migration SQL.
6. Implement `packages/database/src/client.ts` (singleton pattern) and `src/index.ts` (public exports).
7. Add `db:generate`, `db:migrate`, `db:studio` scripts to `packages/database/package.json`; add a `build` script (`tsc -p tsconfig.json`, consistent with the other M1 foundation packages) so `packages/database` typechecks/builds like its siblings.
8. Update `packages/database/README.md` to drop the "Supports ... SQLite" claim (or caveat it as "planned for M11") so documentation matches Option C's actual near-term scope.
9. Verify with a throwaway script (not committed, or committed under a `scripts/` dev-only path) that a `Studio` row can be created and read back — the roadmap's stated M2 definition of done.

## 10. Risks

- **Reversal cost if M11 picks Option 2 (Node sidecar) instead of Rust-native SQLite.** Option C assumes the SQLite question is genuinely deferred without cost; if M11 later needs Prisma-on-SQLite after all, that work (a second schema variant, per Option A) becomes necessary at that point rather than now. This is judged low-risk given ADR 0001 already names Rust-native SQLite as the lead candidate, but it is not zero-risk.
- **Local dev friction without Docker.** Contributors without Docker installed (or unable to run it, e.g. certain sandboxed/CI environments) cannot run `apps/api` locally against Postgres under Option C without a hosted alternative. Should be documented clearly in `docs/guides/getting-started.md` once M2 lands.
- **`@db.VarChar(120)` is PostgreSQL-specific syntax.** If Option C is later extended to Option A without care, this native-type attribute needs to be stripped or conditionally applied in the SQLite variant, since SQLite has no enforced varchar length. Low risk, just a note for whoever picks up M11.
- **Prisma Client singleton correctness under Nest's watch mode.** A known Prisma+Nest footgun is creating a new `PrismaClient` per hot-reload, exhausting database connections during local development. Must be addressed explicitly in `src/client.ts` (e.g. caching on `globalThis` in development), or connection errors will surface in M3, not M2 — worth getting right now since M2 owns this file.
- **Migration authorship requires a live database at author-time.** `prisma migrate dev` needs to connect to a real (even if local/Docker) database to generate the initial migration — this is unlike M1's packages, which needed no external services to build/typecheck. M2's "definition of done" verification step cannot be fully automated in a sandboxed, network-isolated shell without a running Postgres instance; this should be flagged when M2 moves to implementation.

## 11. Alternatives Considered and Rejected

- **Two schema files (Option A)** — rejected for M2 (not permanently) due to maintenance cost outweighing benefit before any SQLite consumer exists. Reconsider at M11 if Prisma-on-SQLite is chosen.
- **Env-var-swapped single schema (Option B)** — rejected outright as too fragile/unconventional for a "production-ready" foundation, per the standard set in M0/M1.
- **Skipping Docker, using SQLite as the *only* local dev database with Postgres only in production** — considered, but rejected because it reintroduces exactly the schema-drift risk Option A/B create (dev runs against SQLite, prod runs against Postgres, with no guarantee both interpret the schema identically), without even the benefit of an actual SQLite consumer existing yet.
- **Using an ORM other than Prisma** (e.g. Drizzle) — out of scope; Prisma is fixed by the frozen v3 architecture and was not revisited here.

## 12. Next Step

This report is **planning only**. Awaiting your approval of the recommended approach (Option C, §9) — or direction to proceed with Option A/B instead — before any `prisma init`, schema authoring, or migration is executed.
