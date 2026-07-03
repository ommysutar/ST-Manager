# M14 Implementation Report — Dashboard + Phase 3 Foundation

- Status: Implemented, validated, **not committed** (awaiting review per instructions)
- Base: M13 (`29c059b`), committed
- Date: 2026-07-03
- Scope: Dashboard API, contracts/SDK thread, web + desktop dashboard UI, expanded nav, Phase 3 ADR/roadmap, dashboard smoke + PostgreSQL CI job, and this report. No commit or push.
- Source: [M14 planning report](./M14-planning-report.md) (approved as written, including all seven recommended open decisions)

## 1. Executive Summary

M14 opens **Phase 3** with a dashboard-first home experience and the shared foundation for M15–M19. Signed-in users land on `/` with live Studio KPIs (`studioCount`, `recentStudios[]`) and honest empty-state panels for Clients, Calendar, Sessions, Billing, and Reports. The API exposes `GET /dashboard/summary` (JWT) with schema-ready placeholder zeros for future widgets.

All seven open decisions from the planning report were applied as recommended:

1. **Milestone split:** M14–M19 one domain each (Phase 3 roadmap documents the sequence).
2. **Dashboard route:** `/` is the dashboard landing; `/studios` remains secondary.
3. **Desktop scope:** Web-primary for calendar/billing/reports; desktop gets Dashboard + Studios (online API fetch for dashboard).
4. **Client sync:** Deferred to M15.1 (no sync protocol changes in M14).
5. **Soft delete:** Documented for Client from M15 (ADR 0004).
6. **Invoice tax:** Documented for M18 (ADR 0004).
7. **PostgreSQL CI:** New `postgres-integration` job with Postgres 16 service container.

## 2. Files Created

**API (`apps/api/`)**

- `src/modules/dashboard/dashboard.module.ts`
- `src/modules/dashboard/dashboard.controller.ts`
- `src/modules/dashboard/dashboard.service.ts`
- `src/modules/dashboard/dashboard.service.spec.ts` — 2 unit tests
- `scripts/dashboard-smoke.sh`

**Packages**

- `packages/contracts/src/dashboard/dashboard-booking-summary.dto.ts`
- `packages/contracts/src/dashboard/dashboard-summary.dto.ts`
- `packages/api-sdk/src/dashboard/dashboard.api.ts`

**Web**

- `src/components/dashboard/DashboardPageClient.tsx`

**Desktop**

- `src/app/dashboard/DashboardPage.tsx`

**Docs**

- `docs/system-architecture/adr/0004-phase3-domain-overview.md`
- `docs/roadmap/phase3-roadmap.md`
- `docs/meeting-notes/M14-implementation-report.md` (this file)

## 3. Files Modified

**API / CI**

- `apps/api/src/app.module.ts` — register `DashboardModule`
- `apps/api/src/modules/studios/studios.module.ts` — export `StudiosRepository` for dashboard aggregation
- `apps/api/scripts/ci-smoke.sh` — wire `dashboard-smoke.sh`; update suite label to M14
- `.github/workflows/ci.yml` — add `postgres-integration` job

**Packages**

- `packages/constants/src/routes.ts` — `ROUTES.DASHBOARD`
- `packages/contracts/src/index.ts` — export dashboard DTOs
- `packages/api-sdk/src/index.ts` — export `createDashboardApi`
- `packages/database/scripts/seed-dev-user.ts` — Postgres seed path when `NODE_ENV=production` + `DATABASE_URL`

**Web**

- `src/app/page.tsx` — dashboard home (was redirect to `/studios`)
- `src/components/shell/nav-items.ts` — Phase 3 nav (Dashboard + future items disabled)
- `src/components/shell/Sidebar.tsx` — disabled nav rendering with “Soon” badge
- `src/lib/api-client.ts` — `dashboardApi`
- `next.config.ts` — `/api/dashboard` rewrites

**Desktop**

- `src/app/router.tsx` — `/` → `DashboardPage` (was redirect to studios)
- `src/app/shell/nav-items.ts`, `Sidebar.tsx` — same nav expansion as web
- `src/lib/api-client.ts` — `dashboardApi`
- `vite.config.ts` — `/dashboard` proxy

## 4. Dependencies Added

**None.** No new production or dev dependencies.

## 5. Approved Architectural Decisions Applied

| Decision (planning report §13) | Choice applied |
|---|---|
| Milestone split | M14–M19 documented in `phase3-roadmap.md` |
| Dashboard route | `/` is dashboard; Studios at `/studios` |
| Desktop scope | Web-primary for calendar/billing/reports; desktop dashboard online-only |
| Client sync | Deferred to M15.1 |
| Soft delete | ADR 0004 records Client `deletedAt` from M15 |
| Invoice tax | ADR 0004 records single manual tax field for M18 |
| PostgreSQL CI | `postgres-integration` job in `ci.yml` |

## 6. Deviations From Plan (Justified)

### 6.1 Seed script Postgres guard

**Plan assumption:** Seed uses SQLite in CI `api-integration`; Postgres seed in new CI job.

**Reality:** Changing seed to `DATABASE_URL ? getPrisma()` broke local SQLite seed when a dev `.env` defines `DATABASE_URL` without a running Postgres instance.

**Fix:** Use Postgres client only when `NODE_ENV === "production"` **and** `DATABASE_URL` is set (matches CI `postgres-integration` env). SQLite seed unchanged for development and `api-integration`.

### 6.2 React lint: no synchronous setState in effects

**Plan assumption:** Standard fetch-on-mount pattern.

**Reality:** `react-hooks/set-state-in-effect` rejects `setIsLoading(true)` inside `useEffect`.

**Fix:** Derive loading as `canFetch && summary === null && error === null`; fetch callbacks update state asynchronously only.

## 7. Validation Results

| Check | Result |
|---|---|
| `pnpm lint` | Pass — 0 errors, 0 warnings |
| `pnpm typecheck` | Pass — 16 packages |
| `pnpm test` | Pass — **23 tests** (validation 7, utils 5, api-sdk 5, api **6** incl. 2 dashboard) |
| `pnpm build` | Pass — 15 tasks |
| `bash apps/api/scripts/dashboard-smoke.sh` | Pass — 401 without token; authenticated summary shape + placeholder zeros |
| `bash apps/api/scripts/ci-smoke.sh` | Pass — auth + sync + AI + **dashboard** smokes |

**Note:** Smoke tests ran against a local API on port 4000 (`AI_PROVIDER=mock`, SQLite dev DB). CI `api-integration` uses isolated SQLite; `postgres-integration` validates Postgres migrate deploy + dashboard smoke.

## 8. API Summary

### `GET /dashboard/summary`

- **Auth:** JWT required (`JwtAuthGuard`)
- **Response:** `{ success: true, data: DashboardSummaryDataDto }`

| Field | M14 value |
|---|---|
| `studioCount` | Live count from `StudiosRepository` |
| `recentStudios[]` | Up to 5 most recent studios (ISO date strings) |
| `todayBookings[]` | `[]` (schema-ready for M16) |
| `clientCount` | `0` |
| `monthRevenue` | `0` |
| `utilizationPercent` | `0` |

## 9. User-Visible Changes

| Surface | Change |
|---|---|
| **Web `/`** | Dashboard with KPI cards, recent studios, empty-state module panels |
| **Desktop `#/`** | Same dashboard (online API fetch when signed in) |
| **Nav (web + desktop)** | Dashboard, Studios (live); Clients, Calendar, Sessions, Billing, Reports (disabled, “Soon”) |
| **Studios** | Unchanged behavior at `/studios` |

## 10. CI Workflow Summary

### New: `postgres-integration` job

- Postgres 16 service container
- `NODE_ENV=production`, `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/st_manager`
- `db:migrate:postgresql:deploy` + seed + start API + `dashboard-smoke.sh`

### Updated: `api-integration`

- Still SQLite; now runs full `ci-smoke.sh` including dashboard smoke

## 11. Definition of Done (M14 Planning §11)

- [x] `GET /dashboard/summary` — JWT; studio data populated; other sections empty/zero
- [x] `packages/contracts/src/dashboard/` — summary DTOs
- [x] `packages/api-sdk` — `createDashboardApi().getSummary()`
- [x] `packages/constants` — `ROUTES.DASHBOARD`
- [x] Web `/` dashboard + empty-state panels
- [x] Desktop dashboard + online API fetch
- [x] Expanded nav with future items disabled
- [x] ADR 0004 + `phase3-roadmap.md`
- [x] `dashboard.service.spec.ts` + `dashboard-smoke.sh` + `ci-smoke.sh` wiring
- [x] PostgreSQL CI service container
- [x] Proxy rewrites (web `/api/dashboard`, desktop `/dashboard`)
- [x] `docs/meeting-notes/M14-implementation-report.md` written
- [x] Nothing committed until this report is reviewed and approved

**Explicitly not in M14 (as planned):** Client/booking/session/invoice CRUD.

## 12. Known Limitations

1. **Dashboard requires sign-in + online** — no offline/cached dashboard on desktop (by design for M14).
2. **Placeholder KPIs show zeros** — honest empty states until M15–M19 populate widgets.
3. **No UI e2e automation** — manual verification of dashboard layout deferred.
4. **Postgres CI runs dashboard smoke only** — full domain smokes remain on SQLite `api-integration` (auth/sync/ai need no Postgres-specific behavior yet).

---

M14 has not been committed. Work stops here pending review and approval. **No git commit. No push.**
