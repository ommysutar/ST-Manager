# ST Manager Sync Engine

One Studio account = one server-backed source of truth accessible from all authorized devices.

## Architecture

```
UI (useSyncExternalStore hooks)
  → entity store (in-memory snapshot)
  → studio-scoped localStorage (cache + cursor + tombstones + offline queue)
  → api-sdk (HTTP)
  → NestJS module (studio-scoped CRUD + /changes pull)
  → Prisma model (soft delete via deletedAt)
```

### Reusable patterns

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Generic sync helpers | `apps/web/src/lib/sync/` | Studio scope, list-entity store, reconcile runner |
| Entity store | `apps/web/src/lib/{entity}/store.ts` | Snapshot, cache hydrate, reconcile, offline create |
| Entity reconcile | `apps/web/src/lib/{entity}/reconcile.ts` | Focus/online/interval triggers |
| Entity offline queue | `apps/web/src/lib/{entity}/offline-queue.ts` | Temp IDs, pending creates, flush |
| Legacy backfill | `apps/web/src/lib/{entity}/backfill.ts` | Idempotent localStorage → server migration |
| React hooks | `apps/web/src/hooks/use*.ts` | `useSyncExternalStore` + background reconcile |
| App bootstrap | `apps/web/src/components/shell/AppShell.tsx` | Start sync loops on auth |
| API module | `apps/api/src/modules/{entity}/` | CRUD + `GET /changes?since=` |
| Contracts / validation | `packages/contracts`, `packages/validation` | DTOs and Zod schemas |

### Conflict resolution

- **Default:** Last-write-wins by server `updatedAt`.
- **Creates:** Server assigns stable display numbers (`CL-xxxx`, `PRJ-xxxx`, `INQ-xxxx`, `QTN/INV/RCP-xxxx`).
- **Offline creates:** Optimistic temp IDs (`local_cli_*`, `local_prj_*`, `local_bkg_*`, `local_pay_*`, `local_doc_*`, `local_inq_*`); remap on flush; in-flight POST dedupe prevents duplicates after timeout.
- **Bookings:** Server partial unique index on slot occupancy; `SLOT_CONFLICT` on double-book.
- **Deletes:** Soft delete on server; tombstones in local cache; authoritative active-list reconcile catches missed cursor deletes.

### Dependency order (offline flush)

```
Studio settings / services / rooms / slots (config)
Client → Inquiry → Project → Payment → Document → Booking
```

Parent temp IDs must flush and remap before child POST.

---

## Entity sync status

| Entity | Server API | Web sync store | Offline create | Tombstones | Two-device tests |
|--------|------------|----------------|----------------|------------|------------------|
| Clients | ✅ | ✅ | ✅ | ✅ | ✅ (7) |
| Inquiries | ✅ | ✅ | ✅ | ✅ | ✅ (6) |
| Projects | ✅ | ✅ | ✅ | ✅ | ✅ (6) |
| Project bookings | ✅ | ✅ | ✅ | ✅ | ✅ (8) |
| Payments | ✅ | ✅ | ✅ | ✅ | ✅ (5) |
| Documents (QTN/INV/RCP) | ✅ | ✅ | ✅ | ✅ | ✅ (5) |
| Services | ✅ | ✅ | ✅ | ✅ | ✅ (3) |
| Rooms (`StudioRoom`) | ✅ | ✅ | ✅ | ✅ | — |
| Booking slots | ✅ | ✅ | ✅ | ✅ | — |
| Studio settings (profile + WhatsApp) | ✅ | ✅ | PATCH upsert | ✅ | ✅ (3) |

### Intentionally device-local

| Category | Key / location | Reason |
|----------|----------------|--------|
| Inquiry wizard draft | `st-manager-inquiry-wizard-draft` | Temporary multi-step draft |
| Client portal UI flags | `st-manager-client-portal-*` | Per-device portal link state |
| Cloud OAuth config | `st-manager-cloud-config` | Device OAuth tokens |
| Auth tokens | `st-manager.accessToken`, etc. | Session state |
| Entity cache/cursor/tombstones | `st-manager-*-{cache,cursor,...}::{studioId}` | Non-authoritative cache |

### Online-only (separate from workflow)

| Entity | Notes |
|--------|-------|
| API Invoices (billing page) | Postgres `Invoice` model for sessions/billing UI |
| API Bookings/Sessions | Calendar scheduling; not main project workflow |

---

## Production migration policy

- All migrations are **additive** (new tables only).
- **Do not run production migrations** without explicit approval.
- Required migrations for master sync release (in order after project/booking migrations):

  1. `20260828210000_master_sync_entities` — inquiries, payments, studio_documents, studio_services, studio_rooms, booking_slot_definitions, studio_settings

---

## Test matrix

Two-device tests use **isolated MemoryStorage** per device (never shared localStorage).

**Total two-device tests:** 48+ across 8 spec files.

Each entity must pass: create A→B, update B→A, delete A→B, offline create, tombstone/no resurrection, cross-studio isolation (clients reference harness).

See `apps/web/src/lib/clients/two-device-sync.spec.ts` for the reference harness.
