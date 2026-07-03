# M16 Implementation Report — Studio Booking Calendar

- Status: Implemented, validated, **not committed** (awaiting review per instructions)
- Base: M15 (`612597b`), committed
- Date: 2026-07-03
- Scope: Booking model + dual migrations, NestJS `bookings` module with conflict detection, contracts/validation/api-sdk/types thread, web calendar UI (week + month), live dashboard `todayBookings[]`, desktop dashboard widget only, bookings smoke + PostgreSQL CI extension, and this report. No commit or push.
- Source: [M16 planning report](./M16-planning-report.md) (approved as written, including all eight recommended open decisions)

## 1. Executive Summary

M16 delivers **Studio Booking Calendar** — the second related Phase 3 entity after M15 Clients. Signed-in users can create, list-by-range, view, update, and cancel bookings via JWT-protected API routes. Overlapping intervals for the same studio return **409 Conflict**. The web portal exposes a full calendar at `/calendar` (week default + month toggle) with separate create/edit routes. The dashboard home now shows live **`todayBookings[]`** instead of the M14 placeholder. Desktop receives the live dashboard widget only; calendar CRUD remains web-only per Option A.

All eight open decisions from the planning report were applied as recommended:

1. **Desktop Calendar:** Web-only calendar; desktop dashboard `todayBookings[]` widget only (Option A). Calendar nav stays disabled on desktop.
2. **Cancel semantics:** `status: cancelled` only — no `deletedAt` set on cancel.
3. **Dashboard:** Live `todayBookings[]` only — no `upcomingBookings[]` added to DTO.
4. **Route auth:** All booking routes JWT-protected.
5. **Calendar views:** Week default + month toggle.
6. **Web UX:** Separate routes `/calendar`, `/calendar/new`, `/calendar/[id]`.
7. **Calendar library:** `react-day-picker` v9 + custom week time-grid.
8. **PostgreSQL CI:** `postgres-integration` job extended to run `bookings-smoke.sh`.

## 2. Files Created

**Database (`packages/database/`)**

- `prisma/postgresql/migrations/20260703170000_add_booking/migration.sql`
- `prisma/sqlite/migrations/20260703170000_add_booking/migration.sql`

**API (`apps/api/`)**

- `src/modules/bookings/bookings.module.ts`
- `src/modules/bookings/bookings.controller.ts`
- `src/modules/bookings/bookings.service.ts`
- `src/modules/bookings/bookings.service.spec.ts` — 5 unit tests
- `src/modules/bookings/bookings.repository.ts`
- `src/modules/bookings/bookings.mapper.ts`
- `scripts/bookings-smoke.sh`

**Packages**

- `packages/types/src/booking.ts`
- `packages/contracts/src/booking/create-booking.dto.ts`
- `packages/contracts/src/booking/update-booking.dto.ts`
- `packages/contracts/src/booking/list-bookings.dto.ts`
- `packages/contracts/src/booking/booking-response.dto.ts`
- `packages/validation/src/booking/booking.schema.ts`
- `packages/validation/src/booking/booking.schema.test.ts`
- `packages/api-sdk/src/bookings/bookings.api.ts`
- `packages/api-sdk/src/bookings/bookings.api.test.ts` — 2 unit tests

**Web**

- `src/app/calendar/page.tsx`
- `src/app/calendar/new/page.tsx`
- `src/app/calendar/[id]/page.tsx`
- `src/components/calendar/CalendarPageClient.tsx`
- `src/components/calendar/BookingCreatePageClient.tsx`
- `src/components/calendar/BookingEditPageClient.tsx`
- `src/components/calendar/BookingForm.tsx`
- `src/lib/calendar-utils.ts`

**Docs**

- `docs/meeting-notes/M16-planning-report.md`
- `docs/meeting-notes/M16-implementation-report.md` (this file)

## 3. Files Modified

**API / CI**

- `apps/api/src/app.module.ts` — register `BookingsModule`
- `apps/api/src/common/filters/http-exception.filter.ts` — map 409 → `BOOKING_CONFLICT`
- `apps/api/src/modules/dashboard/dashboard.module.ts` — import `BookingsModule`
- `apps/api/src/modules/dashboard/dashboard.service.ts` — live `todayBookings[]` via `BookingsRepository.findToday()`
- `apps/api/src/modules/dashboard/dashboard.service.spec.ts` — booking aggregation assertions
- `apps/api/src/modules/studios/studios.repository.ts` — add `findById()` for FK validation
- `apps/api/scripts/ci-smoke.sh` — wire `bookings-smoke.sh`; update suite label to M16
- `apps/api/scripts/dashboard-smoke.sh` — remove M14 placeholder checks; assert live `todayBookings[]` shape
- `.github/workflows/ci.yml` — `postgres-integration` runs `bookings-smoke.sh`

**Packages**

- `packages/database/prisma/postgresql/schema.prisma` — `Booking` model + Studio/Client back-relations
- `packages/database/prisma/sqlite/schema.prisma` — `Booking` model + Studio/Client back-relations
- `packages/constants/src/routes.ts` — `ROUTES.BOOKINGS`
- `packages/constants/src/errors.ts` — `API_ERROR_CODES.BOOKING_CONFLICT`
- `packages/contracts/src/index.ts` — export booking DTOs
- `packages/types/src/index.ts` — export `Booking`, `BookingStatus`, `BookingWithRelations`
- `packages/validation/src/index.ts` — export booking schemas
- `packages/api-sdk/src/index.ts` — export `createBookingsApi`

**Web**

- `src/components/shell/nav-items.ts` — Calendar nav enabled (removed disabled/“Soon”)
- `src/components/dashboard/DashboardPageClient.tsx` — live Today's bookings panel; removed Calendar empty-state panel
- `src/lib/api-client.ts` — `bookingsApi`
- `next.config.ts` — `/api/bookings` rewrites
- `package.json` — add `react-day-picker`
- `pnpm-lock.yaml` — lockfile update

**Desktop**

- `src/app/dashboard/DashboardPage.tsx` — live Today's bookings panel; Calendar empty panel notes web-only (Option A)

## 4. Dependencies Added

| Package | Version | App | Purpose |
|---|---|---|---|
| `react-day-picker` | `^9.11.1` | `@st-manager/web` | Month navigation / date picker for calendar UI |

No new API or desktop dependencies.

## 5. Approved Architectural Decisions Applied

| Decision (planning report §15) | Choice applied |
|---|---|
| Desktop Calendar | Option A — web-only calendar; desktop dashboard widget only |
| Cancel semantics | `status: cancelled` only (no `deletedAt` on cancel) |
| Dashboard widgets | `todayBookings[]` only |
| Booking route auth | All routes JWT-protected |
| Calendar views | Week default + month toggle |
| Web create/edit UX | Separate routes `/calendar/new`, `/calendar/[id]` |
| Calendar library | `react-day-picker` v9 + custom week grid |
| PostgreSQL CI | `postgres-integration` runs `bookings-smoke.sh` |

## 6. Deviations From Plan (Justified)

### 6.1 Next.js Suspense boundary on `/calendar/new`

**Plan assumption:** Create page reads query params via `useSearchParams()` for slot pre-fill.

**Reality:** Next.js 15 production build requires `useSearchParams()` inside a `<Suspense>` boundary.

**Fix:** Wrapped `BookingCreatePageClient` in `<Suspense>` on `calendar/new/page.tsx`.

### 6.2 Calendar loading state without effect setState

**Plan assumption:** Standard fetch-on-mount pattern in calendar page.

**Reality:** ESLint `react-hooks/set-state-in-effect` flagged `setIsLoading(true)` inside a `useEffect`.

**Fix:** Derive loading via `loadedRangeKey !== rangeKey` instead of explicit loading state in effect.

### 6.3 Smoke PATCH conflict test requires second booking

**Plan assumption:** Single booking suffices for overlap PATCH test.

**Reality:** PATCH with same interval as self would not trigger conflict (excludeId excludes current booking).

**Fix:** Create a second non-overlapping booking before PATCH overlap assertion in `bookings-smoke.sh`.

## 7. Validation Results

| Check | Result |
|---|---|
| `pnpm lint` | Pass — 0 errors, 0 warnings |
| `pnpm typecheck` | Pass — 16 packages |
| `pnpm test` | Pass — **50 tests** (validation **21** incl. 6 booking, utils 5, api-sdk **9** incl. 2 booking, api **15** incl. 5 booking + 2 dashboard) |
| `pnpm build` | Pass — 15 tasks (web, desktop, api, packages) |
| `bash apps/api/scripts/bookings-smoke.sh` | Pass — 401 without token; CRUD lifecycle; 409 conflict on create and PATCH; cancel excluded from range; dashboard shape |
| `bash apps/api/scripts/ci-smoke.sh` | Pass — auth + sync + AI + dashboard + clients + **bookings** smokes |

**Note:** Smoke tests ran against a local API on port 4000 (`AI_PROVIDER=mock`, SQLite dev DB with booking migration applied). CI `api-integration` uses isolated SQLite + full `ci-smoke.sh`; `postgres-integration` runs migrate deploy + seed + dashboard + clients + **bookings** smokes.

## 8. API Summary

### Booking routes (`/bookings`)

- **Auth:** JWT required on all routes (`JwtAuthGuard`)
- **Active filter:** Queries exclude `status: cancelled` bookings
- **Conflict:** Overlap on same `studioId` returns **409** with `BOOKING_CONFLICT`
- **Cancel:** `DELETE /bookings/:id` sets `status: cancelled` (row retained)

| Method | Path | Status | Description |
|---|---|---|---|
| `POST` | `/bookings` | 201 / 409 | Create booking |
| `GET` | `/bookings` | 200 | List by range (`studioId`, `from`, `to`) |
| `GET` | `/bookings/:id` | 200 / 404 | Get active booking |
| `PATCH` | `/bookings/:id` | 200 / 404 / 409 | Update fields |
| `DELETE` | `/bookings/:id` | 200 / 404 | Cancel booking |

### `GET /dashboard/summary` (extended)

| Field | M16 value |
|---|---|
| `studioCount`, `recentStudios[]` | Unchanged (live from M14) |
| `clientCount`, `recentClients[]` | Unchanged (live from M15) |
| `todayBookings[]` | **Live list** — active bookings intersecting today (UTC day boundaries) |
| `monthRevenue`, `utilizationPercent` | Still `0` (M18/M19) |

## 9. User-Visible Changes

| Surface | Change |
|---|---|
| **Web `/calendar`** | Studio selector; week time-grid (default); month toggle; click slot → create; click booking → edit |
| **Web `/calendar/new`** | Create booking form (pre-filled from query params) |
| **Web `/calendar/[id]`** | Edit / cancel booking form |
| **Nav (web)** | Calendar enabled |
| **Nav (desktop)** | Calendar **still disabled** — “Soon” (Option A) |
| **Dashboard (web + desktop)** | Live Today's bookings panel when data exists |
| **Desktop dashboard** | Calendar info panel directs users to web portal for calendar management |
| **Clients / Studios** | Unchanged |

## 10. CI Workflow Summary

### Updated: `postgres-integration`

- After migrate deploy + seed + start API:
  - `dashboard-smoke.sh` (asserts `todayBookings[]` array shape)
  - `clients-smoke.sh`
  - **`bookings-smoke.sh`** (CRUD lifecycle + conflict detection + dashboard shape)

### Updated: `api-integration`

- Still SQLite; runs full `ci-smoke.sh` including new bookings smoke

## 11. Definition of Done (M16 Planning §16)

- [x] `Booking` model migrated in SQLite + PostgreSQL with Studio/Client relations
- [x] Booking API operational, JWT-protected, conflict detection enforced
- [x] Web calendar UI functional (week + month, create/edit/cancel)
- [x] Desktop calendar per Option A (dashboard widget only; nav disabled)
- [x] Dashboard shows live `todayBookings[]`
- [x] Calendar nav enabled on web; smokes + unit tests in CI
- [x] `docs/meeting-notes/M16-implementation-report.md` written
- [x] Nothing committed until this report is reviewed and approved

**Explicitly not in M16 (as planned):** M11 sync for Booking (M16.1); desktop calendar CRUD; `upcomingBookings[]`; recurring bookings; external calendar sync; booking → session conversion (M17); utilization KPI; offline booking storage.

## 12. Known Limitations

1. **Desktop calendar deferred** — web-only per Option A; M16.1 for desktop calendar + sync.
2. **Browser-local timezone MVP** — datetimes stored UTC; calendar display uses browser local time; cross-timezone staff may see shifted wall-clock times.
3. **Single-studio view** — no “all studios” overlay in calendar MVP.
4. **No drag-and-drop reschedule** — edit via form only.
5. **No UI e2e automation** — manual verification of calendar forms deferred.
6. **Cancelled bookings retained** — hidden from calendar/list but not hard-deleted; no “cancelled bookings” archive UI.
7. **Postgres CI runs dashboard + clients + bookings smokes only** — full domain smokes (auth/sync/ai) remain on SQLite `api-integration`.

---

M16 has not been committed. Work stops here pending review and approval. **No git commit. No push.**
