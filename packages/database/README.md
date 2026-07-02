# @st-manager/database

Single source of truth for the data layer: Prisma schema, migrations, and a typed client export.
Maintains two independent Prisma datasources (see `docs/meeting-notes/M2-planning-report.md` and
`docs/meeting-notes/M2-implementation-report.md` for the rationale):

- **PostgreSQL** — primary/production datasource, consumed by `apps/api`.
- **SQLite** — local-development / future-desktop preparation datasource (ADR 0001 defers real
  desktop-embedded usage to milestone M11; not consumed by any app yet).

## Structure

- `prisma/postgresql/schema.prisma` + `prisma.config.postgresql.ts` — PostgreSQL schema, config, and migrations.
- `prisma/sqlite/schema.prisma` + `prisma.config.sqlite.ts` — SQLite schema, config, and migrations.
- `src/client.ts` — PostgreSQL Prisma Client singleton (`prisma`), the one consumed by `apps/api`.
- `src/sqlite.ts` — SQLite Prisma Client factory (`createSqlitePrismaClient`), prepared but unused by any app yet.
- `src/index.ts` — public package exports.

## Usage

```bash
# Copy and fill in local values (never commit .env)
cp .env.example .env

# Generate both Prisma Clients (also runs automatically before build/typecheck)
pnpm --filter @st-manager/database run db:generate

# Apply the SQLite migration locally (file-based, no server required)
pnpm --filter @st-manager/database run db:migrate:sqlite:dev

# Deploy the PostgreSQL migration against a real database (see infra/docker)
pnpm --filter @st-manager/database run db:migrate:postgresql:deploy
```

Status: initialized (M2). `Studio` is the only model. PostgreSQL migration SQL was generated
offline (`prisma migrate diff --from-empty`) and has not yet been applied to a live database — see
the implementation report for details.
