# M16 Planning Report — Studio Booking Calendar

- Date: 2026-07-03
- Milestone: M16 (Studio Booking Calendar)
- Source: [phase3-roadmap.md](../roadmap/phase3-roadmap.md), [M14 planning report](./M14-planning-report.md), [M15 planning report](./M15-planning-report.md), [M15 implementation report](./M15-implementation-report.md), [ADR 0004](../system-architecture/adr/0004-phase3-domain-overview.md)
- Status: **Planning only — no application code, dependencies, scaffolding commands, or commits have been generated.** Awaiting approval before implementation.

**Note on source documents:** M16 scope is taken from the approved Phase 3 master plan ([M14 planning report §4](./M14-planning-report.md)) and [phase3-roadmap.md](../roadmap/phase3-roadmap.md). M14 reserved the `todayBookings[]` dashboard DTO shape and disabled Calendar nav; M15 delivered live Clients. M16 introduces the `Booking` entity, conflict detection, calendar UI, and live dashboard booking widgets.

## 1. Current Repository State (Post M15)

Repository history after M15 (`612597b`):

```
… (M0–M14 as documented in prior reports)
b5ce650 feat(dashboard): implement dashboard and Phase 3 foundation (M14)
612597b feat(clients): implement client management (M15)
```

What exists today:

| Layer | State |
|---|---|
| **Database** | `Studio`, `User`, `Client` (PostgreSQL + SQLite dual schema). **No `Booking` model.** Second Phase 3 entity relation (`Booking.studioId`, `Booking.clientId?`). |
| **API** | `health`, `studios`, `auth`, `sync`, `ai`, `dashboard`, **`clients`** modules. `GET /dashboard/summary` returns live `clientCount` + `recentClients[]`; **`todayBookings: []`** placeholder. |
| **Packages** | Threads for studio, auth, sync, ai, dashboard, **client**. **No booking thread.** `DashboardBookingSummaryDto` exists (schema-ready since M14). |
| **Types** | `Studio`, `Client` only. **No `Booking` domain type.** |
| **Web** | Dashboard `/`, Studios `/studios`, Clients `/clients` (+ new/edit routes). Nav includes **Calendar (disabled, “Soon”)**. |
| **Desktop** | Dashboard `#/`, Studios `#/studios`, Clients `#/clients` (online API CRUD). Same disabled Calendar nav. **No local Booking storage.** |
| **CI** | `quality`, `test`, `api-integration` (SQLite full `ci-smoke.sh`), **`postgres-integration`** (dashboard + clients smokes), `desktop-build`. **No bookings smoke.** |
| **Tests** | **37 Vitest unit tests** (validation 15, utils 5, api-sdk 7, api 10 incl. clients + dashboard). |
| **ADRs** | 0001 (desktop SQLite), 0002 (custom JWT), 0003 (soft delete deferred for **Studio**), **0004 (Phase 3 — Booking is M16; Client soft delete shipped M15)**. |

**M15 outcome:** Client CRUD is live on web and desktop (online API). Dashboard client KPIs are populated. Calendar nav slot is reserved but non-functional. M16 fills that slot and replaces `todayBookings[]` placeholder with real booking data.

## 2. M16 Goal (from Phase 3 Roadmap)

> **Goal:** Visual calendar per studio; create/edit/cancel bookings; conflict detection.

From [phase3-roadmap.md](../roadmap/phase3-roadmap.md):

| Milestone | Domain | Outcome |
|---|---|---|
| **M16** | Booking Calendar | Calendar UI + conflict detection; **today's bookings widget** |

**Scope interpretation (strict):**

- **In scope:** `Booking` Prisma model + dual-schema migration (relations to `Studio`, optional `Client`); NestJS `bookings` module (create, list-by-range, get-by-id, update, cancel/soft-delete); contracts/validation/api-sdk/types thread; **conflict detection** on create/update (overlapping intervals per studio); web Calendar page (week view MVP + month toggle recommended); enable Calendar nav; extend `DashboardService` with live **`todayBookings[]`** (+ optional **`upcomingBookings[]`** per open decision #3); `bookings-smoke.sh` + CI wiring; unit tests for booking service/validation/conflict logic; optional minimal screen spec stub.
- **Out of scope:** M11 sync protocol extension for Booking (**M16.1**); `Session`/`Invoice` models or foreign keys; recurring bookings; multi-timezone / DST handling beyond browser-local MVP; external calendar sync (Google/Outlook); email/SMS reminders; drag-and-drop reschedule (nice-to-have, not required); booking → session conversion (**M17**); utilization % KPI (still placeholder on dashboard until M19 aggregates); changes to Studio/Client/sync behavior except booking aggregation and FK validation.

M16 **requires schema migration with relations, API module with conflict rules, calendar UI, and dashboard widget**. It should **not** block on desktop offline/sync complexity.

## 3. Data Model

### 3.1 `Booking` entity (recommended)

Second related Phase 3 entity. Follows M5/M15 conventions (`cuid`, timestamps, dual schema).

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | Server-generated only |
| `studioId` | `String` | **Required** FK → `Studio.id` |
| `clientId` | `String?` | Optional FK → `Client.id` (must reference active client) |
| `title` | `String` | Required display label (e.g. “Mix session — Acme”) |
| `startAt` | `DateTime` | Interval start (inclusive) |
| `endAt` | `DateTime` | Interval end (exclusive recommended — see §4.3) |
| `status` | `String` | MVP enum as string: `confirmed` \| `cancelled` |
| `notes` | `String?` | Free-text |
| `deletedAt` | `DateTime?` | Soft delete / archive (optional — see open decision #2) |
| `createdAt` | `DateTime @default(now())` | |
| `updatedAt` | `DateTime @updatedAt` | |

**PostgreSQL schema** (`packages/database/prisma/postgresql/schema.prisma`):

- `title` → `@db.VarChar(120)`
- `status` → `@db.VarChar(32)` with default `"confirmed"`
- `notes` → `@db.Text` optional
- Relations:
  - `studio Studio @relation(fields: [studioId], references: [id])`
  - `client Client? @relation(fields: [clientId], references: [id])`
- Index: `@@index([studioId, startAt, endAt])` for range + conflict queries

**SQLite schema** (`packages/database/prisma/sqlite/schema.prisma`):

- Same fields **without** `@db.*` attributes (M2/M11 dual-schema rule)
- Same relations and index
- `@@map("bookings")`

**Prisma relation back-references:**

- `Studio.bookings Booking[]`
- `Client.bookings Booking[]`

### 3.2 Domain type

`packages/types/src/booking.ts`:

```ts
export type BookingStatus = "confirmed" | "cancelled";

export interface Booking {
  id: string;
  studioId: string;
  clientId: string | null;
  title: string;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Wire DTOs use ISO strings for datetimes (M5/M15 precedent). Response DTOs may embed `studioName` and `clientName` for calendar display without extra round-trips.

### 3.3 Status vs soft delete (open decision #2)

Per M14 master plan and ADR 0004:

- **Recommended:** `status: cancelled` for user-facing cancel; keep row for audit. **Also** set `deletedAt` on cancel OR treat `cancelled` + `deletedAt: null` as hidden from calendar but retained in DB — pick one consistent rule in implementation (see §15).
- **Conflict detection** excludes bookings where `status = 'cancelled'` and/or `deletedAt != null` (active booking filter).
- **No hard SQL delete in M16 MVP.**

### 3.4 Timezone (M16 MVP constraint)

Per M14 risk mitigation #3:

- Store `startAt` / `endAt` as UTC `DateTime` in DB (Prisma default).
- Web calendar operates in **browser local timezone** for display and slot selection.
- API validates `endAt > startAt`; no recurrence; no explicit studio timezone field in M16.
- Document limitation: cross-timezone staff viewing the same studio may see shifted wall-clock times until a studio timezone setting lands in a future milestone.

## 4. API Design

### 4.1 Module layout

```
apps/api/src/modules/bookings/
  bookings.module.ts
  bookings.controller.ts
  bookings.service.ts
  bookings.repository.ts
  bookings.mapper.ts
  bookings.service.spec.ts
```

Register `BookingsModule` in `app.module.ts`. Export `BookingsRepository` for `DashboardModule` aggregation (M14/M15 dashboard pattern).

### 4.2 Routes (`ROUTES.BOOKINGS = "bookings"`)

All routes **JWT-protected** (recommended — matches Clients; see open decision #4).

| Method | Path | Status | Description |
|---|---|---|---|
| `POST` | `/bookings` | 201 | Create booking; **409 on conflict** |
| `GET` | `/bookings` | 200 | Range query: `studioId`, `from`, `to` (ISO datetimes) |
| `GET` | `/bookings/:id` | 200 / 404 | Get active booking |
| `PATCH` | `/bookings/:id` | 200 / 404 / 409 | Update fields; **409 on conflict** |
| `DELETE` | `/bookings/:id` | 200 / 404 | Cancel / soft-delete (per open decision #2) |

**Not in M16:** `POST /bookings/:id/restore`, bulk import, recurrence expansion endpoints.

### 4.3 Conflict detection (core business rule)

Two intervals `[startA, endA)` and `[startB, endB)` **overlap** when:

```
startA < endB AND startB < endA
```

**Rules:**

1. Scope conflicts to the **same `studioId`** only.
2. Exclude inactive bookings (`status = cancelled` and/or soft-deleted — per chosen filter).
3. On create: check overlap against all active bookings for `studioId`.
4. On update: same check, excluding the booking being updated (`id != :id`).
5. Validate referenced `studioId` exists (StudiosRepository or FK error).
6. If `clientId` provided: validate client exists and `deletedAt IS NULL`.
7. Validate `endAt > startAt` (minimum duration e.g. 15 minutes — optional, recommend 15 min floor).
8. Return **`409 Conflict`** with structured error body `{ success: false, error: { code: "BOOKING_CONFLICT", message: "..." } }` (extend existing HTTP exception filter pattern if needed).

**Repository:** dedicated `findOverlapping(studioId, startAt, endAt, excludeId?)` using Prisma `where` with interval overlap conditions.

### 4.4 List-by-range query

`GET /bookings?studioId=&from=&to=`

- **Required:** `studioId`, `from`, `to` (ISO 8601 strings, Zod-validated)
- Returns all **active** bookings intersecting `[from, to)` for calendar rendering
- Intersection query: `startAt < to AND endAt > from`
- Optional pagination deferred — calendar range is bounded (week/month), expect modest result sets

### 4.5 Response shape (contracts)

`packages/contracts/src/booking/`:

- `create-booking.dto.ts`, `update-booking.dto.ts`
- `list-bookings-query.dto.ts` — `studioId`, `from`, `to`
- `booking-response.dto.ts` — includes denormalized `studioName`, `clientName | null` for UI
- Envelope types: `CreateBookingResponseDto`, `ListBookingsResponseDto`, etc.

Validation in `packages/validation/src/booking/`:

- `createBookingSchema`, `updateBookingSchema`, `listBookingsQuerySchema`
- Datetime strings → `z.string().datetime()` (or project-preferred ISO helper)
- `endAt` refine: must be after `startAt`

## 5. Dashboard Extension

M14 fixed `DashboardBookingSummaryDto` shape in `packages/contracts/src/dashboard/dashboard-booking-summary.dto.ts`:

```ts
export interface DashboardBookingSummaryDto {
  id: string;
  title: string;
  studioId: string;
  studioName: string;
  startAt: string;
  endAt: string;
}
```

**M16 changes:**

| Field | M16 value |
|---|---|
| `todayBookings[]` | Live list — active bookings whose interval intersects **today** (browser-local day boundaries converted to UTC query, or server UTC day — see open decision #3) |
| `clientCount`, `recentClients[]`, `recentStudios[]` | Unchanged (live from M15/M14) |
| `monthRevenue`, `utilizationPercent` | Still `0` (M18/M19) |

**DashboardService** imports `BookingsRepository` (same pattern as `ClientsRepository`).

**Dashboard UI (web + desktop):**

- Replace empty “Today's bookings” panel with live list when data exists
- Remove “Available after booking calendar (M16)” hint from Utilization KPI (unchanged) — booking KPI card is not in current layout; today's bookings panel is the target widget per roadmap

**Optional extension (open decision #3):** add `upcomingBookings[]` (next 7 days) to summary DTO — master plan mentions “upcoming this week”; M14 DTO only has `todayBookings[]`. Recommend **`todayBookings[]` only in M16** to avoid DTO churn, unless stakeholder prefers both.

## 6. Web UI (`apps/web`)

### 6.1 Routes (recommended)

| Route | Purpose |
|---|---|
| `/calendar` | Main calendar view (studio selector + week/month toggle) |
| `/calendar/new` | Create booking form (pre-filled from slot click query params: `studioId`, `startAt`, `endAt`) |
| `/calendar/[id]` | Edit / cancel booking |

Separate routes match M15 Clients UX precedent (open decision #6).

### 6.2 Calendar view (recommended MVP)

- **Studio selector** — dropdown of studios from `studiosApi.list()` (required filter; no “all studios” overlay in MVP)
- **Week view default** — 7-day grid with hourly rows (e.g. 08:00–22:00) or simplified slot list per day
- **Month toggle** — switch to month grid showing booking chips per day; clicking a day drills to week/day detail or opens create form
- **Create from slot** — click empty slot → navigate to `/calendar/new?studioId=…&startAt=…&endAt=…`
- **Booking block click** → `/calendar/[id]` edit form
- **Conflict errors** — show API 409 message inline on save

### 6.3 Calendar library (open decision #7)

No calendar dependency exists today. Options:

| Option | Pros | Cons |
|---|---|---|
| **A. `react-day-picker` v9 + custom week grid** (recommended) | Lightweight; month picker familiar; fits shadcn ecosystem | Week time-grid is custom layout work |
| **B. Custom grid with `@internationalized/date`** | Full control; no heavy deps | More implementation time |
| **C. FullCalendar (or similar)** | Rich calendar UX out of the box | New dependency weight; licensing/size |

**Recommendation:** **Option A** — add `react-day-picker` for month navigation/date picking; build week time-grid in app layer using existing `Card`, `Button`, `Select` from `packages/ui`.

### 6.4 Nav & proxy

- Enable Calendar in `nav-items.ts` (remove `disabled` / `comingSoon`)
- Add `/api/bookings` rewrites in `next.config.ts`
- `clientsApi` pattern → `bookingsApi` in `api-client.ts`

### 6.5 Shared form

- `BookingForm` — title, studio (read-only on edit), optional client select (from `clientsApi.list`), start/end datetime-local inputs, notes
- Client dropdown: paginated fetch or search — reuse list API with reasonable `pageSize`

## 7. Desktop UI (`apps/desktop`)

Per ADR 0004 and M14 §6.3, booking calendar is **web-primary**. Options:

| Option | M16 effort | Capability |
|---|---|---|
| **A. Web-only — defer desktop Calendar to M16.1** (recommended) | None in M16 | Desktop nav Calendar stays disabled or shows “Use web for calendar” |
| **B. Read-only online calendar** | Medium | View week/month; no create/edit on desktop |
| **C. Full online CRUD** (mirror M15 Clients Option A) | High | Same as web when signed in |

**Recommendation:** **Option A** — web-only calendar in M16. Desktop dashboard still receives live **`todayBookings[]`** via existing online dashboard fetch (same as M14/M15 dashboard pattern). Enables M16.1 for desktop calendar + sync without blocking web delivery.

If Option B/C chosen instead, mirror web routes in hash router (`#/calendar`, etc.) and vite proxy.

## 8. Migrations & Dual Schema

M16 is the **first relation expansion** beyond standalone entities. Requires:

1. Edit **both** PostgreSQL and SQLite schemas — add `Booking` model + `Studio`/`Client` back-relations
2. Generate migrations:
   - SQLite: `pnpm --filter @st-manager/database run db:migrate:sqlite:dev`
   - PostgreSQL: new migration folder under `prisma/postgresql/migrations/`
3. `pnpm run db:generate` — regenerate both Prisma clients
4. CI `postgres-integration` — new migration must deploy cleanly

**Rust desktop SQLite:** **No change in M16** if desktop Option A (web-only). M16.1 would add bookings table + sync when approved.

**Seed (optional, recommended):** extend seed script with 2–3 sample bookings across today/tomorrow for dashboard/calendar QA — aids manual validation and smoke assertions.

## 9. Tests & CI

### 9.1 Unit tests (recommended minimum)

| Location | Tests |
|---|---|
| `packages/validation/src/booking/booking.schema.test.ts` | create/update/list schemas; end after start |
| `apps/api/src/modules/bookings/bookings.service.spec.ts` | create success; conflict 409; cancel; not-found; client/studio validation |
| `packages/api-sdk/src/bookings/bookings.api.test.ts` | create unwrap; list range query |

Target: **+10–14 tests** (regression on existing 37).

### 9.2 Integration smoke

**`apps/api/scripts/bookings-smoke.sh`:**

1. `GET /bookings` without token → 401
2. Login → ensure at least one studio exists (create if needed)
3. `POST /bookings` → 201 with valid interval
4. `POST /bookings` with overlapping interval same studio → **409**
5. `GET /bookings?studioId=&from=&to=` → includes created booking
6. `GET /bookings/:id` → 200
7. `PATCH /bookings/:id` → 200; overlapping patch → 409
8. `DELETE /bookings/:id` → cancel; excluded from list range
9. `GET /dashboard/summary` → `todayBookings` array shape valid (may be empty if booking not today)

Wire into `ci-smoke.sh` (update suite label to M16). Extend **`postgres-integration`** to run `bookings-smoke.sh` after clients smoke (open decision #8).

## 10. Estimated Implementation Time

| Area | Estimate |
|---|---|
| Schema + migration (dual, relations, index) | 1–1.5 days |
| API module + conflict logic + tests | 2–3 days |
| Contracts / validation / api-sdk | 1–1.5 days |
| Web calendar UI (week + month + forms) | 3–4 days |
| Desktop (Option A: dashboard widget only) | 0.5 day |
| Dashboard extension + UI | 1 day |
| Smoke + CI + docs | 0.5–1 day |
| **Total M16** | **~3–4 weeks** (matches Phase 3 master plan) |

Assumes one developer familiar with the codebase, plan → approve → implement → validate workflow.

## 11. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **Calendar UI complexity** | M16 slips | Week view MVP first; month toggle second; defer drag-drop |
| 2 | **Timezone confusion** | Bookings appear on wrong day | Document browser-local MVP; store UTC; consistent query boundaries |
| 3 | **Conflict edge cases** | Double-booking or false positives | Unit test overlap matrix; exclusive end intervals; exclude cancelled |
| 4 | **FK validation** | Orphan bookings or bad client refs | Service-layer checks before create/update |
| 5 | **Desktop scope creep** | Sync rewrite delays web | Web-only calendar (Option A); M16.1 for desktop |
| 6 | **Dashboard DTO churn** | Client breaks | Reuse existing `DashboardBookingSummaryDto`; populate `todayBookings[]` only |
| 7 | **New dependency** | Bundle size / maintenance | Prefer minimal `react-day-picker`; avoid FullCalendar unless approved |
| 8 | **Range query performance** | Slow calendar load | Index `(studioId, startAt, endAt)`; bound default range to visible week/month |
| 9 | **Studio list empty** | Calendar unusable | Empty state directing user to create a studio first |

## 12. Validation Plan

### 12.1 Pre-commit gates

1. `pnpm install`
2. `pnpm lint` — zero new errors/warnings
3. `pnpm typecheck` — all scoped packages pass
4. `pnpm test` — booking unit tests + regression
5. `pnpm build` — full monorepo build
6. SQLite `migrate dev` + manual create/view/conflict on web calendar
7. `bash apps/api/scripts/bookings-smoke.sh` + full `ci-smoke.sh`
8. Sign in → create booking → visible on calendar → overlap rejected
9. Dashboard shows today's bookings when booking intersects today
10. `docs/meeting-notes/M16-implementation-report.md` before commit approval

### 12.2 Manual e2e checklist

| Step | Criterion |
|---|---|
| Web calendar | Select studio → week shows bookings in range |
| Web create | Slot click → form → save → appears on calendar |
| Web conflict | Overlapping save shows error; no double booking |
| Web edit | PATCH moves booking; conflict on overlap |
| Web cancel | Booking removed from calendar view |
| Dashboard | `todayBookings` lists today's items |
| Regression | Clients, studios, auth, sync, AI, dashboard smokes pass |

## 13. Expected User-Visible Features (End of M16)

After M16, a signed-in studio owner can:

| Surface | Capability |
|---|---|
| **Web `/calendar`** | Select a studio; view bookings in week (and month) view; create a booking with title, optional client, start/end, notes; edit or cancel a booking; see conflict prevented before save |
| **Desktop** | Dashboard **today's bookings** widget live when online (calendar page deferred per open decision #1) |
| **Dashboard** | **Today's bookings** panel shows real data; Calendar nav entry active on web |
| **API** | Authenticated booking CRUD + range query + conflict enforcement |

**Not yet available:** booking → session conversion; recurring bookings; external calendar sync; desktop calendar CRUD; utilization KPI; offline booking storage.

## 14. M16 Implementation Preview (On Approval)

When this plan is approved, **M16 implementation** would deliver:

**Database**

- `Booking` model in both Prisma schemas + committed migrations
- Relations to `Studio` and optional `Client`
- Index for range/conflict queries

**API**

- `POST/GET/PATCH/DELETE /bookings`, `GET /bookings/:id` — JWT protected
- `GET /bookings?studioId=&from=&to=` — calendar range
- **409 Conflict** on overlapping active bookings per studio

**Packages**

- `packages/types` — `Booking`, `BookingStatus`
- `packages/contracts/src/booking/` — DTOs
- `packages/validation/src/booking/` — Zod schemas
- `packages/api-sdk` — `createBookingsApi()`
- `packages/constants` — `ROUTES.BOOKINGS`

**Dashboard**

- Live `todayBookings[]` in `GET /dashboard/summary`
- Dashboard UI shows today's bookings (web + desktop)

**Calendar (web)**

- `/calendar`, `/calendar/new`, `/calendar/[id]`
- Nav enabled on web

**Tests / CI**

- `bookings.service.spec.ts`, validation tests, api-sdk tests
- `bookings-smoke.sh` wired into `ci-smoke.sh`

**Docs**

- `docs/meeting-notes/M16-implementation-report.md`

## 15. Open Decisions Requiring Approval

1. **Desktop Calendar in M16:** **Web-only calendar; desktop dashboard widget only** (recommended, Option A) vs **read-only online calendar** (Option B) vs **full online CRUD on desktop** (Option C).

2. **Cancel semantics:** **`status: cancelled` only** (recommended) vs **`status: cancelled` + `deletedAt`** vs **soft-delete via `deletedAt` only** (no status field).

3. **Dashboard booking widgets:** Populate **`todayBookings[]` only** (recommended — matches existing DTO) vs **add `upcomingBookings[]`** (next 7 days) to summary DTO.

4. **Route auth:** **All booking routes JWT-protected** (recommended) vs public `GET /bookings` range like studios list.

5. **Calendar views:** **Week default + month toggle** (recommended) vs week-only vs month-only.

6. **Web create/edit UX:** **Separate routes** (`/calendar/new`, `/calendar/[id]`) (recommended) vs modal/drawer on calendar page.

7. **Calendar library:** **`react-day-picker` v9 + custom week grid** (recommended) vs **`@internationalized/date` custom grid** vs **FullCalendar**.

8. **PostgreSQL CI:** Extend **`postgres-integration`** to run **`bookings-smoke.sh`** (recommended) vs SQLite `api-integration` only for booking smokes.

---

**Stopping here per instructions** — no source code, dependencies, scaffolding commands, or commits have been touched. Awaiting review and approval of this M16 plan (and the eight open decisions above) before M16 implementation begins.

## 16. Definition of Done

**This planning report (approval gate):**

- [ ] Stakeholder confirms M16 scope (Booking CRUD + conflict detection + calendar UI + dashboard widget, no Session/sync).
- [ ] Open decisions in §15 resolved.
- [ ] No implementation until **M16 implementation** is explicitly requested after this report is approved.

**M16 complete (after implementation):**

- [ ] `Booking` model migrated in SQLite + PostgreSQL with Studio/Client relations
- [ ] Booking API operational, JWT-protected, conflict detection enforced
- [ ] Web calendar UI functional (week + month, create/edit/cancel)
- [ ] Desktop calendar per approved Option A/B/C
- [ ] Dashboard shows live `todayBookings[]` (+ optional upcoming per decision #3)
- [ ] Calendar nav enabled on web; smokes + unit tests in CI
- [ ] `docs/meeting-notes/M16-implementation-report.md` committed
- [ ] Nothing committed until implementation report is reviewed and approved
