# M15 Planning Report — Client Management

- Date: 2026-07-03
- Milestone: M15 (Client Management)
- Source: [phase3-roadmap.md](../roadmap/phase3-roadmap.md), [M14 planning report](./M14-planning-report.md), [ADR 0004](../system-architecture/adr/0004-phase3-domain-overview.md), M5/M10/M14 planning and implementation reports
- Status: **Planning only — no application code, dependencies, scaffolding commands, or commits have been generated.** Awaiting approval before implementation.

**Note on source documents:** M15 scope is taken from the approved Phase 3 master plan ([M14 planning report §4](./M14-planning-report.md)) and [phase3-roadmap.md](../roadmap/phase3-roadmap.md). M14 delivered the dashboard shell and placeholder nav entry for Clients; M15 makes Clients a live domain.

## 1. Current Repository State (Post M14)

Repository history after M14 (`b5ce650`):

```
… (M0–M13 as documented in prior reports)
304f730 feat(ai): implement studio summary generation (M12)
29c059b feat(ci): implement CI/CD and hardening (M13)
b5ce650 feat(dashboard): implement dashboard and Phase 3 foundation (M14)
```

What exists today:

| Layer | State |
|---|---|
| **Database** | `Studio` + `User` only (PostgreSQL + SQLite dual schema). **No `Client` model.** First Phase 3 entity migration since M5. |
| **API** | `health`, `studios`, `auth`, `sync`, `ai`, **`dashboard`** modules. `GET /dashboard/summary` returns **`clientCount: 0`** placeholder. |
| **Packages** | `packages/contracts`, `validation`, `api-sdk` threads for studio, auth, sync, ai, dashboard. **No client thread.** |
| **Types** | `packages/types` exports `Studio` only. **No `Client` domain type.** |
| **Web** | Dashboard at `/`, Studios at `/studios`. Nav includes **Clients (disabled, “Soon”)**. |
| **Desktop** | Dashboard at `#/`, Studios at `#/studios`. Same disabled Clients nav. Local-first **Studios** via Rust SQLite + M11 sync. **No local Client storage.** |
| **CI** | `quality`, `test`, `api-integration` (SQLite smokes), **`postgres-integration`** (migrate deploy + dashboard smoke), `desktop-build`. **No clients smoke.** |
| **Tests** | 23 Vitest unit tests (Studio vertical slice + dashboard service). |
| **ADRs** | 0001 (desktop SQLite), 0002 (custom JWT), 0003 (soft delete deferred for **Studio**), **0004 (Phase 3 — Client `deletedAt` from M15)**. |

**M14 outcome:** dashboard-first home with live Studio KPIs and honest empty states. Clients nav slot is reserved but non-functional. M15 fills that slot and replaces dashboard placeholders with real client data.

## 2. M15 Goal (from Phase 3 Roadmap)

> **Goal:** CRUD clients (contacts, notes); link clients to future bookings/sessions/invoices.

From [phase3-roadmap.md](../roadmap/phase3-roadmap.md):

| Milestone | Domain | Outcome |
|---|---|---|
| **M15** | Client Management | Client CRUD; dashboard **client count** widget |

**Scope interpretation (strict):**

- **In scope:** `Client` Prisma model + dual-schema migration; NestJS `clients` module (create, list, get-by-id, update, soft delete); contracts/validation/api-sdk/types thread; web Clients page (list, create, edit, search); desktop Clients page (see open decision #1); enable Clients nav; extend `DashboardService` with live `clientCount` (+ `recentClients[]` per recommendation); `clients-smoke.sh` + CI wiring; unit tests for client service/validation; optional minimal screen spec stub.
- **Out of scope:** M11 sync protocol extension for Client (**M15.1**); `Booking`/`Session`/`Invoice` models or foreign keys; client import/export (CSV); client portal / external auth; multi-tenant isolation; RBAC beyond JWT owner; email uniqueness enforcement across tenants; duplicate-detection AI; changes to Studio or sync behavior except dashboard aggregation.

M15 **requires schema migration, API module, package threads, and client UI**. It should **not** block on desktop offline/sync complexity.

## 3. Data Model

### 3.1 `Client` entity (recommended)

First new domain entity in Phase 3. Follows M5/M11 conventions (`cuid`, timestamps, dual schema).

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | Server-generated only |
| `name` | `String` | Required; primary display + search field |
| `email` | `String?` | Optional contact email |
| `phone` | `String?` | Optional |
| `company` | `String?` | Optional organization name |
| `notes` | `String?` | Free-text; `@db.Text` on PostgreSQL if needed |
| `deletedAt` | `DateTime?` | **Soft delete** — nullable, no default (ADR 0004 + ADR 0003 pattern) |
| `createdAt` | `DateTime @default(now())` | |
| `updatedAt` | `DateTime @updatedAt` | |

**PostgreSQL schema** (`packages/database/prisma/postgresql/schema.prisma`):

- `name` → `@db.VarChar(120)` (consistent with Studio name cap)
- `email` → `@db.VarChar(255)` optional
- `phone`, `company` → `@db.VarChar(64)` optional (reasonable MVP caps)
- `notes` → `@db.Text` optional

**SQLite schema** (`packages/database/prisma/sqlite/schema.prisma`):

- Same fields **without** `@db.*` attributes (M2/M11 dual-schema rule)
- `@@map("clients")`

**No relations in M15** — `Booking.clientId` lands in M16. Keeps migration reversible and scope thin.

### 3.2 Domain type

`packages/types/src/client.ts`:

```ts
export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Wire DTOs use `string | null` for optional fields and ISO strings for dates (M5 precedent).

### 3.3 Soft delete (recommended)

Per ADR 0004 and M14 approved decision #5:

- `DELETE /clients/:id` sets `deletedAt = now()` — **not** a hard SQL delete
- `findMany` / `count` / `findById` default to `where: { deletedAt: null }`
- Deleted clients disappear from list, detail, and dashboard aggregates
- **No restore endpoint in M15** — can add `POST /clients/:id/restore` in a future hardening milestone if needed

This supersedes ADR 0003's Studio-only deferral for the new **Client** resource.

## 4. API Design

### 4.1 Module layout

Follow M5 precedent under `apps/api/src/modules/clients/`:

```
clients.module.ts
clients.controller.ts
clients.service.ts
clients.repository.ts
clients.mapper.ts
```

Register in `app.module.ts`. Export `ClientsRepository` if dashboard aggregation calls it directly (same pattern as M14 `StudiosRepository`).

### 4.2 Routes

All routes JWT-protected (`JwtAuthGuard`) — clients are operational data, unlike public `GET /studios` (M10 decision).

| Method | Path | Status | Purpose |
|---|---|---|---|
| `POST` | `/clients` | 201 | Create client |
| `GET` | `/clients` | 200 | Paginated list + optional name search |
| `GET` | `/clients/:id` | 200 | Detail |
| `PATCH` | `/clients/:id` | 200 | Update mutable fields |
| `DELETE` | `/clients/:id` | 200 | Soft delete (`deletedAt` set) |

`ROUTES.CLIENTS = "clients"` in `packages/constants`.

### 4.3 List query (recommended)

Mirror Studio pagination (`listStudiosQuerySchema` pattern):

| Query param | Type | Default | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | 1 | |
| `pageSize` | int 1–100 | 20 | Reuse `PAGINATION` constants |
| `search` | string? | — | Case-insensitive **name contains** filter |

Response: `{ success: true, data: ClientResponseDto[], meta: PaginationMetaDto }`.

Order: `createdAt desc` (stable, same as studios).

### 4.4 Create / update payloads

**Create (`CreateClientDto`):**

| Field | Required | Validation |
|---|---|---|
| `name` | yes | trim, 1–120 chars |
| `email` | no | valid email or empty → null |
| `phone` | no | max 64 |
| `company` | no | max 120 |
| `notes` | no | max 2000 (sanity cap) |

**Update (`UpdateClientDto`):** same fields, all optional, at least one required (Zod `.refine`).

### 4.5 Error cases

| Case | Code | Status |
|---|---|---|
| Validation failure | `VALIDATION_ERROR` | 400 |
| Client not found (or soft-deleted) | `NOT_FOUND` | 404 |
| Unauthenticated | — | 401 |

Reuse existing `HttpExceptionFilter` and `API_ERROR_CODES`.

## 5. Package Threads

### 5.1 `packages/contracts/src/client/`

| File | Purpose |
|---|---|
| `client-response.dto.ts` | Wire shape (ISO date strings, nullable optionals) |
| `create-client.dto.ts` | Create request |
| `update-client.dto.ts` | Patch request |
| `list-clients.dto.ts` | Query + paginated response |

### 5.2 `packages/validation/src/client/`

| Schema | Purpose |
|---|---|
| `createClientSchema` | POST body |
| `updateClientSchema` | PATCH body |
| `listClientsQuerySchema` | GET query (`page`, `pageSize`, `search`) |

Unit tests in `client.schema.test.ts` (required fields, bounds, search optional).

### 5.3 `packages/api-sdk/src/clients/clients.api.ts`

```ts
createClient(input): Promise<ClientResponseDto>
listClients(query?): Promise<ListClientsResponseDto>
getClient(id): Promise<ClientResponseDto>
updateClient(id, input): Promise<ClientResponseDto>
deleteClient(id): Promise<void> // or { success: true } envelope — match API
```

### 5.4 `packages/constants`

- `ROUTES.CLIENTS`
- No new error codes expected unless `CLIENT_NOT_FOUND` alias is desired — `NOT_FOUND` suffices.

## 6. Dashboard Extension

M14 ships `clientCount: 0` and empty `todayBookings[]`. M15 updates `DashboardService`:

| Field | M15 behavior |
|---|---|
| `clientCount` | Live count from `ClientsRepository.count()` (non-deleted only) |
| `recentClients[]` | **Recommended:** up to 5 most recent clients (new DTO shape in contracts) |

**Recommended `DashboardClientSummaryDto`:**

```ts
{ id, name, company?, createdAt }  // ISO string on wire
```

Add to `DashboardSummaryDataDto` alongside existing fields. Dashboard UI replaces placeholder Clients KPI and empty-state panel with real data + link to `/clients`.

**Not in M15 dashboard:** booking/session/billing widgets (M16–M19).

## 7. Client UI

### 7.1 Web (`apps/web`)

| Route | Page |
|---|---|
| `/clients` | Clients list with search, pagination, “Add client” |
| `/clients/new` | Create form (or inline drawer — see open decision #6) |
| `/clients/[id]` | Edit form + soft delete action |

**Nav:** enable Clients entry (remove `disabled` / `comingSoon`).

**Components (app layer, M6/M14 precedent):**

- `ClientsPageClient` — list + search
- `ClientForm` — shared create/edit (could live in `packages/ui` if reusable; **recommend app layer first**, extract to `packages/ui` only if desktop shares identical markup)

**Auth:** all mutations require sign-in (same as Studio create on web).

**Proxy:** add `/api/clients` rewrites in `next.config.ts`.

### 7.2 Desktop (`apps/desktop`)

Per ADR 0004, desktop Client UX is an **open decision** (§13). Options:

| Option | M15 effort | Offline |
|---|---|---|
| **A. Online API CRUD** (recommended) | Medium — mirror web against API | No — requires network |
| **B. Read-only online list** | Low | No |
| **C. Defer desktop to M15.1** | None in M15 | — |

**Recommendation:** **Option A** — online API CRUD without local SQLite or sync. Matches M14 dashboard pattern; avoids M11 protocol work while giving desktop users client management when online. M15.1 adds offline/sync if approved later.

**Nav:** enable Clients route in hash router + `nav-items.ts`.

**Proxy:** add `/clients` to `vite.config.ts` dev proxy.

### 7.3 UI primitives

Reuse `Card`, `Input`, `Button` from `packages/ui`. List can follow Studios card/list pattern. **No new `packages/ui` components required for M15 MVP** unless `ClientForm` extraction is chosen.

## 8. Migrations & Dual Schema

M15 is the **first schema expansion** since M5/M10 `User`. Requires:

1. Edit **both** `schema.postgresql.prisma` and `schema.sqlite.prisma`
2. Generate migrations:
   - SQLite: `pnpm --filter @st-manager/database run db:migrate:sqlite:dev` (local dev)
   - PostgreSQL: new migration via `prisma migrate dev` against Postgres **or** `migrate diff` script (follow M2/M14 CI path)
3. `pnpm run db:generate` — regenerate both Prisma clients
4. CI `postgres-integration` — `db:migrate:postgresql:deploy` already runs; new migration must deploy cleanly

**Rust desktop SQLite:** **No change in M15** if Option A (online-only). M15.1 would add `clients` table to `apps/desktop/src-tauri/src/db/migrations.rs` when sync lands.

**Seed (optional, recommended):** extend `seed-dev-user.ts` or add `seed-dev-clients.ts` with 2–3 sample clients for dashboard/demo QA — not required for DoD but aids manual validation.

## 9. Tests & CI

### 9.1 Unit tests (recommended minimum)

| Location | Tests |
|---|---|
| `packages/validation/src/client/client.schema.test.ts` | create/update/list schemas |
| `apps/api/src/modules/clients/clients.service.spec.ts` | create, list search, soft delete, not-found |
| `apps/api/src/modules/clients/clients.mapper.spec.ts` | optional if mapper non-trivial |
| `packages/api-sdk/src/clients/clients.api.test.ts` | create unwrap, list envelope |

Target: **+8–12 tests** (regression on existing 23).

### 9.2 Integration smoke

**`apps/api/scripts/clients-smoke.sh`:**

1. `GET /clients` without token → 401
2. Login → `POST /clients` → 201
3. `GET /clients` → includes created client
4. `GET /clients/:id` → 200
5. `PATCH /clients/:id` → updated name
6. `DELETE /clients/:id` → soft delete; subsequent `GET` → 404
7. `GET /dashboard/summary` → `clientCount >= 0` and `recentClients` shape valid

Wire into `ci-smoke.sh`. Extend **`postgres-integration`** job to run full `ci-smoke.sh` or at minimum `clients-smoke.sh` after dashboard smoke (open decision #7).

## 10. Estimated Implementation Time

| Area | Estimate |
|---|---|
| Schema + migration (dual) | 0.5–1 day |
| API module + tests | 1.5–2 days |
| Contracts / validation / api-sdk | 1 day |
| Web Clients UI | 2–3 days |
| Desktop Clients UI (Option A) | 1.5–2 days |
| Dashboard extension + UI | 0.5–1 day |
| Smoke + CI + docs | 0.5–1 day |
| **Total M15** | **~2–2.5 weeks** (matches Phase 3 master plan) |

Assumes one developer familiar with the codebase, plan → approve → implement → validate workflow.

## 11. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **First Phase 3 migration** | SQLite/Postgres drift | Dual-schema edit in one PR; CI postgres deploy gate |
| 2 | **Desktop scope creep** | M11 sync rewrite delays web | Default to online API CRUD; defer sync to M15.1 |
| 3 | **Dashboard DTO change** | Clients break if shape wrong | Add `recentClients[]` in contracts first; extend smoke assertions |
| 4 | **Soft delete confusion** | Users expect hard delete | UI copy: “Archive client”; deleted rows hidden from list |
| 5 | **Search performance** | Slow on large lists | Index not required at MVP scale; add index on `name` in M16+ if needed |
| 6 | **No screen spec** | UX ambiguity | Minimal list/form layout described in §7; optional `docs/screen-specifications/clients.md` stub |
| 7 | **Public vs protected list** | Inconsistent with studios | All client routes JWT (recommended) — document in API README |

## 12. Validation Plan

### 12.1 Pre-commit gates

1. `pnpm install`
2. `pnpm lint` — zero new errors/warnings
3. `pnpm typecheck` — all scoped packages pass
4. `pnpm test` — client unit tests + regression
5. `pnpm build` — full monorepo build
6. SQLite `migrate dev` + manual create/list/edit/delete on web
7. `bash apps/api/scripts/clients-smoke.sh` + full `ci-smoke.sh`
8. Sign in → create client → appears in list, detail, dashboard count
9. `docs/meeting-notes/M15-implementation-report.md` before commit approval

### 12.2 Manual e2e checklist

| Step | Criterion |
|---|---|
| Web list | Empty state → create → client appears |
| Web search | Filter by name substring works |
| Web edit | PATCH persists; form shows updated values |
| Web delete | Client removed from list; dashboard count decrements |
| Desktop (if Option A) | Same flows online when signed in |
| Dashboard | `clientCount` and `recentClients` reflect data |
| Regression | Studios, auth, sync, AI, dashboard smokes still pass |

## 13. Expected User-Visible Features (End of M15)

After M15, a signed-in studio owner can:

| Surface | Capability |
|---|---|
| **Web `/clients`** | View paginated client list; search by name; add a client with name, email, phone, company, notes; open a client to edit; archive (soft delete) a client |
| **Desktop `#/clients`** | Same as web when online and signed in (Option A) — or read-only/deferred per open decision |
| **Dashboard** | See live **client count** and **recent clients**; Clients nav entry active |
| **API** | Full client CRUD for authenticated integrations via REST |

**Not yet available:** link client to booking/session/invoice; offline client list on desktop; client sync; import/export.

## 14. M15 Implementation Preview (On Approval)

When this plan is approved, **M15 implementation** would deliver:

**Database**

- `Client` model in both Prisma schemas + committed migrations

**API**

- `POST/GET/PATCH/DELETE /clients`, `GET /clients/:id` — JWT protected

**Packages**

- `packages/types` — `Client`
- `packages/contracts/src/client/` — DTOs
- `packages/validation/src/client/` — Zod schemas
- `packages/api-sdk` — `createClientsApi()`
- `packages/constants` — `ROUTES.CLIENTS`

**Dashboard**

- Live `clientCount` + `recentClients[]` in `GET /dashboard/summary`
- Dashboard UI shows real client KPIs

**Clients**

- Web `/clients` (+ detail/edit routes)
- Desktop `#/clients` (per approved open decision #1)
- Nav enabled on both platforms

**Tests / CI**

- `clients.service.spec.ts`, validation tests, api-sdk tests
- `clients-smoke.sh` wired into `ci-smoke.sh`

**Docs**

- `docs/meeting-notes/M15-implementation-report.md`

## 15. Open Decisions Requiring Approval

1. **Desktop Clients in M15:** **Online API CRUD when signed in** (recommended, Option A) vs **read-only list** (Option B) vs **defer all desktop Clients to M15.1** (Option C).

2. **Soft delete:** Implement **`DELETE /clients/:id` with `deletedAt`** in M15 (recommended per ADR 0004) vs **update-only (no delete endpoint)** in M15.

3. **Dashboard `recentClients[]`:** Include **up to 5 recent clients** in summary DTO (recommended) vs **`clientCount` only**.

4. **Client route auth:** **All routes JWT-protected** (recommended) vs public `GET /clients` like studios.

5. **Search:** **Name substring** filter (recommended) vs no search in M15 (pagination only).

6. **Web create/edit UX:** **Separate routes** (`/clients/new`, `/clients/[id]`) (recommended) vs **inline modal/drawer** on list page.

7. **PostgreSQL CI:** Extend **`postgres-integration`** to run **`clients-smoke.sh`** (recommended) vs SQLite `api-integration` only for client smokes.

---

**Stopping here per instructions** — no source code, dependencies, scaffolding commands, or commits have been touched. Awaiting review and approval of this M15 plan (and the seven open decisions above) before M15 implementation begins.

## 16. Definition of Done

**This planning report (approval gate):**

- [ ] Stakeholder confirms M15 scope (Client CRUD + dashboard widgets, no sync).
- [ ] Open decisions in §15 resolved.
- [ ] No implementation until **M15 implementation** is explicitly requested after this report is approved.

**M15 complete (after implementation):**

- [ ] `Client` model migrated in SQLite + PostgreSQL
- [ ] Client API CRUD operational and JWT-protected
- [ ] Web Clients UI functional (list, create, edit, archive)
- [ ] Desktop Clients UI per approved Option A/B/C
- [ ] Dashboard shows live `clientCount` (+ `recentClients` if approved)
- [ ] Clients nav enabled; smokes + unit tests in CI
- [ ] `docs/meeting-notes/M15-implementation-report.md` committed
