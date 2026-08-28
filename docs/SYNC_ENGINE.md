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

### Reusable patterns (Client Sync Phase 2 reference)

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Generic sync helpers | `apps/web/src/lib/sync/` | Studio scope, LWW merge, tombstones, reconcile loop |
| Entity store | `apps/web/src/lib/{entity}/store.ts` | Snapshot, cache hydrate, reconcile, offline create |
| Entity reconcile | `apps/web/src/lib/{entity}/reconcile.ts` | Focus/online/interval triggers |
| Entity offline queue | `apps/web/src/lib/{entity}/offline-queue.ts` | Temp IDs, pending creates, flush |
| React hooks | `apps/web/src/hooks/use{Entity}.ts` | `useSyncExternalStore` + background reconcile |
| App bootstrap | `apps/web/src/components/shell/AppShell.tsx` | Start sync loops on auth |
| API module | `apps/api/src/modules/{entity}/` | CRUD + `GET /changes?since=` |
| Contracts / validation | `packages/contracts`, `packages/validation` | DTOs and Zod schemas |

### Conflict resolution

- **Default:** Last-write-wins by server `updatedAt`.
- **Creates:** Server assigns stable display numbers (`CL-xxxx`, `PRJ-xxxx`).
- **Offline creates:** Optimistic temp ID (`local_cli_*`, `local_prj_*`); remap on flush; in-flight POST dedupe prevents duplicates after timeout.
- **Deletes:** Soft delete on server; tombstones in local cache; authoritative active-list reconcile catches missed cursor deletes.

### What stays device-local

| Category | Examples | Reason |
|----------|----------|--------|
| **Temporary draft** | Inquiry wizard draft (`st-manager-inquiry-wizard-draft`) | Intentionally not shared |
| **Device-local cache** | Entity cache/cursor/tombstones (studio-scoped) | Performance; reconciles to server |
| **Session UI state** | Search boxes, open dialogs | Ephemeral |

---

## Entity classification (audit)

| Entity | Class | Source of truth today | Target |
|--------|-------|----------------------|--------|
| Clients | B → A | API + web sync store | ✅ Done (Phase 2) |
| Projects | E+F | localStorage only | Project Sync Phase 1 (in progress) |
| Project bookings | C | localStorage | After projects |
| Payments | E+F | localStorage | After projects |
| Documents (QTN/INV/RCP) | E+F | localStorage | After projects |
| Inquiries | E+F | localStorage | After projects or parallel |
| Services / pricing | C | localStorage | Studio config sync phase |
| Rooms (`StudioRoom`) | C | localStorage | Studio config sync phase |
| Slots | C | localStorage | Studio config sync phase |
| Studio profile | B | Split API + localStorage | Extend profile API for branding |
| Branding / templates | C | localStorage | Studio config sync phase |
| WhatsApp settings | C | localStorage | Studio config sync phase |
| Wizard drafts | C (intentional) | localStorage | Stay device-local |
| API Bookings (calendar) | D | API, unused by workflow UI | Bridge or deprecate |
| API Sessions / Billing | A (online-only) | API | Optional cache layer later |

Legend: **A** server-synced · **B** partial · **C** localStorage-only · **D** API exists, UI uses localStorage · **E** no workflow API · **F** needs schema migration · **G** sync implementation only

---

## Rollout order

1. **Clients** — complete (PR #4)
2. **Projects** — hub entity; bookings/payments/documents depend on `projectId`
3. **Inquiries** — upstream of projects
4. **Payments + Documents** — financial records; immutable snapshot rules
5. **Project bookings + slots + rooms** — scheduling; server-side double-booking
6. **Studio configuration** — services, branding, WhatsApp, templates

---

## Production migration policy

- All new entity migrations are **additive** (new tables/columns).
- **Do not run production migrations** without explicit approval.
- Report required migration name, SQL summary, and impact before deploy.

---

## Test matrix

Two-device tests use **isolated MemoryStorage** per device (never shared localStorage).

See `apps/web/src/lib/clients/two-device-sync.spec.ts` for the reference harness.

Each entity must pass: create A→B, update B→A, delete A→B, offline create, retry/idempotency, tombstone, no resurrection, cross-studio isolation.
