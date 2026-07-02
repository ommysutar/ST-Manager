# Prisma

Two independent schema/config pairs, one per datasource, per the M2 dual-provider decision
(see `docs/meeting-notes/M2-planning-report.md` and `docs/meeting-notes/M2-implementation-report.md`):

- `postgresql/schema.prisma` + `../../prisma.config.postgresql.ts` — primary/production datasource, consumed by `apps/api`.
- `sqlite/schema.prisma` + `../../prisma.config.sqlite.ts` — local-dev / future-desktop preparation datasource (ADR 0001, M11).

Each has its own `migrations/` history (Prisma requires migrations to live next to the schema file that owns the datasource block). Run `pnpm --filter @st-manager/database run db:generate` to generate both clients.

Status: initialized (M2). `Studio` is the only model.
