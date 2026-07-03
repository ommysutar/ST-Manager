# M15 Implementation Report — Client Management

- Status: Implemented, validated, **not committed** (awaiting review per instructions)
- Base: M14 (`b5ce650`), committed
- Date: 2026-07-03
- Scope: Client model + dual migrations, NestJS `clients` module, contracts/validation/api-sdk/types thread, web + desktop Clients UI, live dashboard client KPIs, clients smoke + PostgreSQL CI extension, and this report. No commit or push.
- Source: [M15 planning report](./M15-planning-report.md) (approved as written, including all seven recommended open decisions)

## 1. Executive Summary

M15 delivers **Client Management** — the first Phase 3 domain entity after M14's dashboard foundation. Signed-in users can create, list, search, edit, and soft-delete clients via JWT-protected API routes. The dashboard home now shows live **`clientCount`** and up to five **`recentClients[]`** instead of placeholder zeros. Web and desktop both expose Clients navigation and CRUD UI (desktop uses online API only; M11 sync deferred to M15.1).

All seven open decisions from the planning report were applied as recommended:

1. **Desktop Clients:** Online API CRUD when signed in (Option A) — no local SQLite, no M11 sync.
2. **Soft delete:** `DELETE /clients/:id` sets `deletedAt`; deleted clients excluded from list/get.
3. **Dashboard:** Live `clientCount` + `recentClients[]` (up to 5) in `GET /dashboard/summary`.
4. **Auth:** All client routes JWT-protected (unlike public studio list).
5. **Search:** Case-insensitive name substring on PostgreSQL; SQLite uses `contains` without `mode`.
6. **Web UX:** Separate routes `/clients`, `/clients/new`, `/clients/[id]`.
7. **PostgreSQL CI:** `postgres-integration` job extended to run `clients-smoke.sh`.

## 2. Files Created

**Database (`packages/database/`)**

- `prisma/postgresql/migrations/20260703162000_add_user/migration.sql` — Postgres `users` table (CI prerequisite; see §6.1)
- `prisma/postgresql/migrations/20260703163000_add_client/migration.sql`
- `prisma/sqlite/migrations/20260703163000_add_client/migration.sql`

**API (`apps/api/`)**

- `src/modules/clients/clients.module.ts`
- `src/modules/clients/clients.controller.ts`
- `src/modules/clients/clients.service.ts`
- `src/modules/clients/clients.service.spec.ts` — 4 unit tests
- `src/modules/clients/clients.repository.ts`
- `src/modules/clients/clients.mapper.ts`
- `scripts/clients-smoke.sh`

**Packages**

- `packages/types/src/client.ts`
- `packages/contracts/src/client/create-client.dto.ts`
- `packages/contracts/src/client/update-client.dto.ts`
- `packages/contracts/src/client/list-clients.dto.ts`
- `packages/contracts/src/client/client-response.dto.ts`
- `packages/contracts/src/dashboard/dashboard-client-summary.dto.ts`
- `packages/validation/src/client/client.schema.ts`
- `packages/validation/src/client/client.schema.test.ts`
- `packages/validation/src/client/list-clients-query.schema.ts`
- `packages/api-sdk/src/clients/clients.api.ts`
- `packages/api-sdk/src/clients/clients.api.test.ts` — 2 unit tests

**Web**

- `src/app/clients/page.tsx`
- `src/app/clients/new/page.tsx`
- `src/app/clients/[id]/page.tsx`
- `src/components/clients/ClientsPageClient.tsx`
- `src/components/clients/ClientCreatePageClient.tsx`
- `src/components/clients/ClientEditPageClient.tsx`
- `src/components/clients/ClientForm.tsx`

**Desktop**

- `src/app/clients/ClientsPage.tsx`
- `src/app/clients/ClientCreatePage.tsx`
- `src/app/clients/ClientEditPage.tsx`
- `src/components/clients/ClientForm.tsx`

**Docs**

- `docs/meeting-notes/M15-implementation-report.md` (this file)

## 3. Files Modified

**API / CI**

- `apps/api/src/app.module.ts` — register `ClientsModule`
- `apps/api/src/modules/dashboard/dashboard.module.ts` — import `ClientsModule`
- `apps/api/src/modules/dashboard/dashboard.service.ts` — live client aggregation
- `apps/api/src/modules/dashboard/dashboard.service.spec.ts` — client KPI assertions
- `apps/api/scripts/ci-smoke.sh` — wire `clients-smoke.sh`; update suite label to M15
- `apps/api/scripts/dashboard-smoke.sh` — assert `recentClients[]` array shape
- `.github/workflows/ci.yml` — `postgres-integration` runs dashboard + clients smokes

**Packages**

- `packages/database/prisma/postgresql/schema.prisma` — `Client` model
- `packages/database/prisma/sqlite/schema.prisma` — `Client` model
- `packages/constants/src/routes.ts` — `ROUTES.CLIENTS`
- `packages/contracts/src/index.ts` — export client + dashboard client summary DTOs
- `packages/contracts/src/dashboard/dashboard-summary.dto.ts` — add `recentClients[]`
- `packages/types/src/index.ts` — export `Client`
- `packages/validation/src/index.ts` — export client schemas
- `packages/api-sdk/src/index.ts` — export `createClientsApi`
- `packages/api-sdk/src/client/http-client.ts` — add `patch`, `delete` methods
- `packages/api-sdk/src/client/types.ts` — extend `HttpClient` interface
- `packages/api-sdk/src/studios/studios.api.test.ts` — mock `patch`/`delete` on test client

**Web**

- `src/components/shell/nav-items.ts` — Clients nav enabled (removed disabled/“Soon”)
- `src/components/dashboard/DashboardPageClient.tsx` — live client KPI + Recent clients card
- `src/lib/api-client.ts` — `clientsApi`
- `next.config.ts` — `/api/clients` rewrites

**Desktop**

- `src/app/router.tsx` — `#/clients`, `#/clients/new`, `#/clients/:id` routes
- `src/app/shell/nav-items.ts` — Clients nav enabled
- `src/app/dashboard/DashboardPage.tsx` — live client KPI + Recent clients card
- `src/lib/api-client.ts` — `clientsApi`
- `vite.config.ts` — `/clients` proxy

## 4. Dependencies Added

**None.** No new production or dev dependencies.

## 5. Approved Architectural Decisions Applied

| Decision (planning report §15) | Choice applied |
|---|---|
| Desktop Clients | Option A — online API CRUD when signed in |
| Soft delete | `DELETE /clients/:id` sets `deletedAt` |
| Dashboard | `clientCount` + `recentClients[]` (up to 5) |
| Client route auth | All routes JWT-protected |
| Search | Name substring (case-insensitive on PostgreSQL) |
| Web create/edit UX | Separate routes `/clients/new`, `/clients/[id]` |
| PostgreSQL CI | `postgres-integration` runs `clients-smoke.sh` |

## 6. Deviations From Plan (Justified)

### 6.1 PostgreSQL `users` migration

**Plan assumption:** Postgres schema already had `User` from M10 auth work.

**Reality:** PostgreSQL migrations only included `studios` (`init`); `User` existed in SQLite but not Postgres. `postgres-integration` seed failed without a `users` table.

**Fix:** Added `20260703162000_add_user/migration.sql` before the client migration so CI seed and auth smokes work on PostgreSQL.

### 6.2 `HttpClient` patch/delete methods

**Plan assumption:** Clients API uses standard REST verbs via api-sdk.

**Reality:** `HttpClient` only exposed `get` and `post`; `createClientsApi()` requires `patch` and `delete`.

**Fix:** Extended `HttpClient` interface and implementation; updated existing `studios.api.test.ts` mocks.

### 6.3 Zod optional email validation

**Plan assumption:** Standard Zod pipe for optional email on create/update.

**Reality:** Chained `.optional().pipe(z.string().email())` caused a TypeScript error in `@st-manager/validation`.

**Fix:** Rewrote email validation using `.refine()` with separate create/update schema helpers; tests adjusted accordingly.

## 7. Validation Results

| Check | Result |
|---|---|
| `pnpm lint` | Pass — 0 errors, 0 warnings |
| `pnpm typecheck` | Pass — 16 packages |
| `pnpm test` | Pass — **37 tests** (validation **15**, utils 5, api-sdk **7**, api **10** incl. 4 clients + 2 dashboard) |
| `pnpm build` | Pass — 15 tasks |
| `bash apps/api/scripts/clients-smoke.sh` | Pass — 401 without token; CRUD lifecycle; dashboard client KPIs |
| `bash apps/api/scripts/ci-smoke.sh` | Pass — auth + sync + AI + dashboard + **clients** smokes |

**Note:** Smoke tests ran against a local API on port 4000 (`AI_PROVIDER=mock`, SQLite dev DB with client migration applied). CI `api-integration` uses isolated SQLite + full `ci-smoke.sh`; `postgres-integration` runs migrate deploy + seed + dashboard + clients smokes.

## 8. API Summary

### Client routes (`/clients`)

- **Auth:** JWT required on all routes (`JwtAuthGuard`)
- **Soft delete:** `deletedAt` set on DELETE; active queries filter `deletedAt: null`

| Method | Path | Status | Description |
|---|---|---|---|
| `POST` | `/clients` | 201 | Create client |
| `GET` | `/clients` | 200 | List clients (pagination + optional `search` on name) |
| `GET` | `/clients/:id` | 200 / 404 | Get active client by id |
| `PATCH` | `/clients/:id` | 200 / 404 | Update client fields |
| `DELETE` | `/clients/:id` | 200 / 404 | Soft delete (sets `deletedAt`) |

### `GET /dashboard/summary` (extended)

| Field | M15 value |
|---|---|
| `studioCount` | Live count (unchanged) |
| `recentStudios[]` | Up to 5 most recent studios (unchanged) |
| `clientCount` | **Live count** from `ClientsRepository` |
| `recentClients[]` | **Up to 5** most recent active clients (`id`, `name`, `company`, `createdAt`) |
| `todayBookings[]` | `[]` (schema-ready for M16) |
| `monthRevenue` | `0` |
| `utilizationPercent` | `0` |

## 9. User-Visible Changes

| Surface | Change |
|---|---|
| **Web `/clients`** | Client list with search, pagination, create/edit/archive |
| **Web `/clients/new`** | Create client form |
| **Web `/clients/[id]`** | Edit client form |
| **Desktop `#/clients`** | Same CRUD via online API when signed in |
| **Nav (web + desktop)** | Clients enabled (no longer disabled / “Soon”) |
| **Dashboard (web + desktop)** | Live client count KPI; Recent clients card when data exists |
| **Studios** | Unchanged at `/studios` |

## 10. CI Workflow Summary

### Updated: `postgres-integration`

- After migrate deploy + seed + start API:
  - `dashboard-smoke.sh` (asserts `recentClients[]` shape)
  - **`clients-smoke.sh`** (CRUD lifecycle + dashboard client KPIs)

### Updated: `api-integration`

- Still SQLite; runs full `ci-smoke.sh` including new clients smoke

## 11. Definition of Done (M15 Planning §16)

- [x] `Client` model migrated in SQLite + PostgreSQL
- [x] Client API CRUD operational and JWT-protected
- [x] Web Clients UI functional (list, create, edit, archive)
- [x] Desktop Clients UI — Option A (online API CRUD)
- [x] Dashboard shows live `clientCount` + `recentClients[]`
- [x] Clients nav enabled; smokes + unit tests in CI
- [x] `docs/meeting-notes/M15-implementation-report.md` written
- [x] Nothing committed until this report is reviewed and approved

**Explicitly not in M15 (as planned):** M11 sync for Client (M15.1); Booking/Session/Invoice models; client import/export; RBAC beyond JWT owner.

## 12. Known Limitations

1. **Desktop Clients require sign-in + online** — no offline/local SQLite client storage (by design; M15.1 for sync).
2. **Search is name-only** — no email/company full-text search in M15.
3. **No UI e2e automation** — manual verification of client forms deferred.
4. **Soft-deleted clients are hidden** — no “archived clients” list UI in M15.
5. **Postgres CI runs dashboard + clients smokes only** — full domain smokes (auth/sync/ai) remain on SQLite `api-integration`.

---

M15 has not been committed. Work stops here pending review and approval. **No git commit. No push.**
