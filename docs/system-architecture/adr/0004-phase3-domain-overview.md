# ADR 0004: Phase 3 Domain Overview

- Status: **Accepted**
- Date: 2026-07-03 (M14)

## Context

Phase 2 delivered a working technical platform (monorepo, API, desktop/web clients, auth, sync, AI, CI) with a single domain entity (`Studio`). Phase 3 evolves ST Manager into a production-ready recording studio management application with real business workflows: dashboard, clients, booking calendar, sessions, billing, and reports.

The frozen v3 architecture reserves module boundaries per domain (`apps/api/src/modules/{domain}/`, matching `packages/contracts`, `packages/validation`, and `packages/api-sdk` threads). Phase 3 must extend that pattern without re-architecting the stack.

## Decision

**Phase 3 adopts a one-domain-per-milestone sequence (M14–M19)** with the following architectural choices:

| Aspect | Choice |
|---|---|
| Milestone order | M14 Dashboard → M15 Clients → M16 Booking → M17 Sessions → M18 Billing → M19 Reports |
| Dashboard | Read orchestration layer — aggregates via domain repositories; does not own business rules |
| Home route | `/` is the signed-in dashboard landing; `/studios` remains the Studio anchor |
| Client platform | **Web-primary** for calendar, billing, and reports; desktop gets Dashboard + Studios + optional read-only views |
| Desktop sync | Client/booking sync deferred to explicit sub-milestones (M15.1, M16.1) — web features are not blocked |
| Soft delete | `deletedAt` on `Client` from M15 (per ADR 0003 pattern) |
| Production DB | PostgreSQL in production; SQLite in development/test; **PostgreSQL service container added to CI in M14** |
| Entity keys | `cuid` primary keys; timestamps on every model (consistent with M5/M11) |

### Target domain model (end state)

```
Studio ──< Booking >── Client
Studio ──< Session  >── Client
Booking ──o| Session
Client  ──< Invoice
Session ──o| Invoice
User    ──< Studio (manages)
```

- A **Booking** reserves a **Studio** for a time range; optionally links a **Client**.
- A **Session** represents actual studio use; may originate from a **Booking** or be ad hoc.
- An **Invoice** bills a **Client**, optionally tied to a **Session**.

## Consequences

- M14 ships the dashboard shell with real Studio KPIs and schema-ready placeholder DTOs for future widgets.
- Each subsequent milestone (M15–M19) extends the dashboard with live data from its domain without redesigning the summary endpoint shape.
- Calendar, billing, and reports UI work proceeds on web first; desktop parity is explicit and deferred where sync complexity would delay delivery.
- CI validates the PostgreSQL migration path alongside existing SQLite integration tests.
- Product screen specs under `docs/screen-specifications/` should be authored per milestone during planning approval gates.

## References

- [M14 planning report](../../meeting-notes/M14-planning-report.md)
- [Phase 3 roadmap](../../roadmap/phase3-roadmap.md)
- ADR 0001 (Rust SQLite desktop), ADR 0002 (custom JWT), ADR 0003 (soft delete deferred)
