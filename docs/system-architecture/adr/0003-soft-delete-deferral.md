# ADR 0003: Soft Delete Deferral

- Status: Deferred (reserved for a future milestone)
- Date: 2026-07-02

## Context

Milestone M5 implements the first real CRUD-style endpoints for the `Studio` resource: `POST /studios` (create) and `GET /studios` (list). Per the roadmap and M5 planning report, M5's scope is deliberately limited to **Create + List only** — no `PATCH`/`DELETE /studios/:id` exists yet, and none is being added by this ADR.

Even though no delete operation ships in M5, the M5 architectural decisions explicitly reserve the deletion *strategy* now, so a future milestone that adds `DELETE /studios/:id` does not need to re-litigate soft vs. hard delete, and so the `Studio` Prisma schema/model naming stays stable once the field is actually added.

Two deletion strategies were considered for that future milestone:

1. **Hard delete** — `DELETE /studios/:id` issues a real SQL `DELETE`, permanently removing the row. Simple, but destroys audit history and cannot be undone; any future feature relying on historical Studio references (bookings, invoices, sync logs, etc. — not yet designed) would break.
2. **Soft delete** — `DELETE /studios/:id` sets a nullable `deletedAt: DateTime?` column instead of removing the row. Reads (`findMany`/`count`/`findUnique` in `StudiosRepository`) filter it out by default (`where: { deletedAt: null }`). Preserves history, is reversible, and is the more common pattern for an entity (`Studio`) that other future resources are likely to reference.

## Decision

**No `deletedAt` column is added to the `Studio` Prisma schema in M5.** There is no delete endpoint in M5, so there is nothing to soft- or hard-delete yet — adding the column now would be schema churn with no consumer.

The strategy is reserved, not decided-and-implemented: **when a future milestone adds `DELETE /studios/:id`, it should default to the soft-delete approach (option 2)** unless a concrete reason to hard-delete emerges by then. Concretely, that future milestone is expected to:

- Add `deletedAt DateTime?` (nullable, no default) to both `packages/database/prisma/postgresql/schema.prisma` and `packages/database/prisma/sqlite/schema.prisma`, via a proper Prisma migration.
- Update `StudiosRepository.findMany`/`count` (and any `findUnique`-by-id method introduced alongside single-resource `GET`/`DELETE`) to filter `where: { deletedAt: null }` by default, so soft-deleted rows disappear from normal reads without being physically removed.
- Add a new `StudiosRepository.softDelete(id)` method (`update({ where: { id }, data: { deletedAt: new Date() } })`), not a `delete()` call — `apps/api` should never issue a raw Prisma `delete` for `Studio` once this lands, keeping "never access Prisma outside the Repository layer" (M5) and this ADR's decision aligned.

## Consequences

- M5 ships with no delete capability at all (by design — see the M5 planning report's scope).
- `@st-manager/types`' `Studio` interface and `packages/contracts`' `StudioResponseDto` do **not** gain a `deletedAt` field in M5; it is introduced only alongside the milestone that implements deletion, to avoid exposing an always-`null` field with no behavior behind it.
- This ADR should be revisited (or superseded by a new ADR) if, once deletion is actually implemented, a concrete reason to prefer hard delete is found (e.g. legal/GDPR data-removal requirements that soft delete cannot satisfy on its own).
