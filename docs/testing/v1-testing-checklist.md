# ST Manager V1 Testing Checklist

Phase 3 (M14–M19) is complete. This checklist covers manual V1 validation across all shipped modules. Use it before a release or after significant changes.

**Scope:** Features implemented through M19. No new features should be added during this testing pass.

---

## Prerequisites

| Item | Notes |
|---|---|
| **API running** | `pnpm --filter @st-manager/api dev` (default port `4000`) |
| **Web running** | `pnpm --filter @st-manager/web dev` (default port `3000`) |
| **Desktop (optional)** | `pnpm --filter @st-manager/desktop tauri dev` |
| **Dev user** | Seed or use `dev@st-manager.local` / `devpassword` (see `packages/database/scripts/seed-dev-user.ts`) |
| **Browser** | Chrome or Firefox recommended; test one secondary browser |
| **Network** | Most web modules require online API access |

**Sign-in first** on web and desktop before testing protected modules.

---

## 1. Authentication

### Manual test cases

| # | Steps | Expected result |
|---|---|---|
| A1 | Open web app while signed out. Attempt to create a studio, client, or booking. | Protected actions prompt sign-in or show an unauthenticated empty state; no data mutation without auth. |
| A2 | Sign in with valid dev credentials via header login form. | Session established; user name/email visible; protected pages load data. |
| A3 | Sign out. Refresh the page. | User remains signed out; tokens cleared; protected data no longer loads. |
| A4 | Sign in with wrong password. | Clear error message; no partial session; no crash. |
| A5 | Sign in, use the app for 15+ minutes (or shorten `JWT_ACCESS_EXPIRES_IN` in dev), trigger an API call. | Access token refreshes automatically via refresh token; user stays signed in without re-login. |
| A6 | Call `POST /studios` without `Authorization` header (curl/REST client). | `401 Unauthorized`. |
| A7 | Call `GET /studios` without token. | `200` with public list (studios list is intentionally unauthenticated). |
| A8 | Call `GET /dashboard/summary` without token. | `401 Unauthorized`. |

### Edge cases

- Empty email or password on login form.
- Very long email/password strings.
- Sign in on web, open a second tab — both tabs share session.
- Expired or tampered JWT in local storage — next API call should fail gracefully and clear session.
- API server stopped while signed in — network error message, no white screen.

### Possible bugs to watch for

- Refresh loop on 401 (infinite retry).
- Tokens stored but user state not updated after login.
- Sign-out leaves stale data on dashboard from previous session.
- Desktop and web sessions interfering if tested in same browser profile incorrectly.

---

## 2. Dashboard

**Routes:** Web `/` · Desktop `#/`

### Manual test cases

| # | Steps | Expected result |
|---|---|---|
| D1 | Sign in with empty workspace (no studios/clients). | KPI cards show zeros; honest empty states with links to create data. |
| D2 | Create at least one studio, client, booking, session, and paid invoice. Return to dashboard. | All KPI cards and panels show **live** data (not placeholders). |
| D3 | Verify KPI cards: Studios, Clients, Month revenue, Utilization. | Counts and currency/percent match underlying data. |
| D4 | Check **Recent studios** and **Recent clients** lists. | Up to 5 items; links navigate to correct pages. |
| D5 | Create a booking for today. Reload dashboard. | **Today's bookings** lists the booking with studio name and time range. |
| D6 | Start a session (in progress). Complete another session today. | **Sessions** panel shows in-progress and completed-today lists. |
| D7 | Create a sent invoice and a paid invoice this month. | **Billing** panel shows outstanding balance, outstanding list, and paid-this-month list. |
| D8 | Web only: check **Reports** panel. | 7-day revenue trend chart visible; **Open reports** link goes to `/reports`. |
| D9 | Sign out or go offline. Open dashboard. | Appropriate message (sign in required / offline); no crash. |

### Edge cases

- Month boundary: paid invoice dated last month vs this month affects `monthRevenue`.
- Utilization with zero studios vs one studio with no completed sessions (should be 0%).
- Many bookings/sessions/invoices — lists truncate reasonably without breaking layout.
- Desktop: calendar/sessions/billing/reports nav disabled but dashboard widgets still show live API data.

### Possible bugs to watch for

- Stale dashboard after creating data in another tab (may need navigation refresh).
- `monthRevenue` not matching sum of paid-this-month invoices.
- Utilization stuck at 0% despite completed sessions this month.
- Revenue trend chart empty when paid invoices exist in last 7 days.
- Timezone: “today” bookings/sessions differ between UTC server logic and local browser display.

---

## 3. Studios

**Routes:** Web `/studios` · Desktop `#/studios` · API `GET/POST /studios`

### Manual test cases

| # | Steps | Expected result |
|---|---|---|
| S1 | Open Studios page signed in. | List loads (may be empty). |
| S2 | Create a studio with a valid name. | Studio appears in list with created date. |
| S3 | Create studio without signing in (web). | Blocked or requires auth for create. |
| S4 | `GET /studios?page=1&pageSize=20` without auth. | Paginated list returns `{ success, data, meta }`. |
| S5 | Create studio via API with JWT and `{ "name": "Test Studio" }`. | `201` with new studio; appears in list. |
| S6 | Use studio in a booking dropdown (Calendar). | New studio selectable after creation. |
| S7 | Desktop: create and list studios online. | Same behavior as web against API. |

### Edge cases

- Empty name, name over 120 characters, whitespace-only name — validation error.
- Duplicate studio names (allowed — no uniqueness constraint).
- Pagination: create 25+ studios; verify page 2 loads.
- Special characters in studio name (unicode, quotes, emoji).

### Possible bugs to watch for

- Create succeeds but list does not refresh.
- Public `GET /studios` exposes data that should be protected in production deployments.
- Desktop offline: studio list empty or error without clear message.

---

## 4. Clients

**Routes:** Web `/clients`, `/clients/new`, `/clients/[id]` · Desktop `#/clients`, `#/clients/new`, `#/clients/:id` · API full CRUD

### Manual test cases

| # | Steps | Expected result |
|---|---|---|
| C1 | Create client with name only. | Client saved; appears in list. |
| C2 | Create client with name, email, phone, company, notes. | All fields persist on detail/edit page. |
| C3 | Search clients by partial name. | Filtered list matches search term. |
| C4 | Edit client fields and save. | Changes persist after reload. |
| C5 | Soft-delete a client. | Client removed from active list; `GET /clients/:id` returns 404. |
| C6 | Create booking linked to client. | Client name appears on booking and dashboard. |
| C7 | Dashboard **Clients** KPI updates after create/delete. | `clientCount` and `recentClients[]` reflect changes. |
| C8 | Desktop: full CRUD while online and signed in. | Same as web (online API only). |

### Edge cases

- Delete client that has bookings/sessions/invoices — verify FK behavior (may block or orphan depending on data).
- Search with no matches — empty state, not error.
- Very long notes (2000 char limit).
- Edit client after soft-delete — should 404.

### Possible bugs to watch for

- Soft-deleted clients still appearing in list.
- Search case sensitivity differs between SQLite dev and PostgreSQL CI.
- Client dropdowns on booking/session/invoice forms include deleted clients.
- Dashboard client count includes deleted clients.

---

## 5. Calendar (Bookings)

**Routes:** Web `/calendar`, `/calendar/new`, `/calendar/[id]` · Desktop nav **disabled** · API `GET/POST/PATCH/DELETE /bookings`

### Manual test cases

| # | Steps | Expected result |
|---|---|---|
| B1 | Open Calendar; select a studio. | Week view loads bookings for selected studio and date range. |
| B2 | Switch to month view. | Bookings for month displayed; navigation changes range. |
| B3 | Create booking via **New booking** with studio, title, start/end, optional client. | Booking appears on calendar; status confirmed. |
| B4 | Open booking detail; edit title or time. | Changes saved and reflected on calendar. |
| B5 | Cancel/delete booking. | Booking removed from calendar; no longer in active list. |
| B6 | Create overlapping booking for same studio and time. | Conflict error (`BOOKING_CONFLICT` / 409); second booking not saved. |
| B7 | Create booking spanning midnight UTC vs local display. | Times display consistently in UI. |
| B8 | From booking detail, link to start/view session (M17). | Navigates to session create or existing session. |
| B9 | Dashboard **Today's bookings** shows booking when it overlaps today. | Booking listed with correct studio and times. |

### Edge cases

- `endAt` before `startAt` — validation error.
- Booking with no client (optional clientId).
- Edit booking time into conflict with another booking.
- Edit booking to non-overlapping time — succeeds.
- Week/month boundary navigation with no bookings — empty state.
- Filter by studio with no bookings — empty calendar, not error.

### Possible bugs to watch for

- Conflict detection missed for adjacent bookings (end == start).
- Calendar shows bookings for wrong studio after switching studio dropdown.
- Month view performance with many bookings.
- Booking cancelled but still counted in reports client activity.
- `useSearchParams` / Suspense issues on calendar sub-routes (known M16 fix area).

---

## 6. Sessions

**Routes:** Web `/sessions`, `/sessions/new`, `/sessions/[id]` · Desktop nav **disabled** · API lifecycle endpoints

### Manual test cases

| # | Steps | Expected result |
|---|---|---|
| SE1 | Create ad hoc session (studio, title, start time, optional client). | Session created with status `scheduled`. |
| SE2 | Create session from booking (`bookingId`). | Session linked; booking shows session link; duplicate session for same booking rejected. |
| SE3 | **Start** session. | Status `in_progress`; appears in dashboard in-progress list. |
| SE4 | **Complete** session. | Status `completed`; `endedAt` set; appears in completed-today if ended today. |
| SE5 | **Cancel** session. | Status `cancelled`; removed from active lists. |
| SE6 | Filter sessions list by status and date range. | Filters work correctly. |
| SE7 | On completed session detail, **Create invoice from session**. | Navigates to `/billing/new?sessionId=…` with prefilled data. |
| SE8 | Second invoice for same session. | `409 INVOICE_SESSION_ALREADY_LINKED`. |
| SE9 | Invalid transitions: complete before start, start already completed session. | `409 SESSION_INVALID_TRANSITION`. |

### Edge cases

- Session with deleted/inactive client — should fail on create.
- Session with invalid studio ID — 404.
- Complete session without explicit end — `endedAt` set by server on complete.
- Multiple in-progress sessions across different studios.
- Session linked to booking that was cancelled.

### Possible bugs to watch for

- Session stuck in `in_progress` after complete API success but UI not refreshed.
- Dashboard session widgets out of sync with sessions page.
- Utilization report ignores in-progress sessions (only completed count — verify expected behavior).
- Timezone mismatch on session date filters.

---

## 7. Billing (Invoices)

**Routes:** Web `/billing`, `/billing/new`, `/billing/[id]` · Desktop nav **disabled** · API full CRUD + lifecycle

### Manual test cases

| # | Steps | Expected result |
|---|---|---|
| I1 | Create ad hoc invoice: client, line items, tax rate, due date. | Draft invoice with computed subtotal, tax, total; sequential invoice number. |
| I2 | Add multiple line items; change quantities and unit prices. | Line amounts and totals recalculate correctly. |
| I3 | **Send** draft invoice. | Status `sent`; `issuedAt` set; cannot edit as freely as draft. |
| I4 | **Mark paid** sent invoice. | Status `paid`; `paidAt` set; appears in dashboard paid-this-month. |
| I5 | **Void** invoice (DELETE). | Status `void`; excluded from outstanding/revenue reports. |
| I6 | Filter invoice list by status (draft/sent/paid). | Filter returns correct subset. |
| I7 | Print/PDF view on invoice detail. | Print-friendly layout; hides nav chrome when printing. |
| I8 | Create invoice from completed session. | Client/session prefilled; one invoice per session enforced. |
| I9 | Resend already sent invoice. | `409 INVOICE_INVALID_TRANSITION`. |
| I10 | Mark paid on draft without send. | Follow allowed lifecycle or reject — verify actual behavior matches product expectation. |
| I11 | Dashboard billing widgets update after send/pay. | Outstanding balance and lists correct. |

### Edge cases

- Zero tax rate vs 10% tax rate rounding.
- Empty line items — validation error.
- Due date in the past.
- Very large totals (overflow/display).
- Void invoice that was paid — verify reporting excludes it.
- Concurrent invoice number generation (rapid creates).

### Possible bugs to watch for

- Tax/total mismatch between UI preview and saved invoice.
- `monthRevenue` and revenue report disagree on which `paidAt` month counts.
- Draft invoice editable after send.
- Print view cuts off line items on long invoices.
- Invoice number collision under load.

---

## 8. Reports

**Routes:** Web `/reports` · Desktop nav **disabled** · API `GET /reports/revenue`, `/utilization`, `/clients`, `/revenue/export`

### Manual test cases

| # | Steps | Expected result |
|---|---|---|
| R1 | Open Reports; default date range (current month). | All three sections load: Revenue, Utilization, Client activity. |
| R2 | Change date range (from/to). | All reports reload for new range. |
| R3 | Revenue report with paid invoices in range. | `totalRevenue` equals sum of paid invoice totals; daily breakdown matches `paidAt` dates. |
| R4 | Revenue report with no paid invoices. | Zero totals; empty chart/table message. |
| R5 | **Export revenue CSV**. | File downloads; header `date,revenue,invoiceCount`; total row present; opens in spreadsheet. |
| R6 | Utilization report with completed sessions. | Overall % and per-studio breakdown; used minutes ≤ available minutes. |
| R7 | Utilization with no completed sessions. | 0% utilization; studio rows still listed if studios exist. |
| R8 | Client activity report. | Clients with bookings, sessions, or revenue in range listed; sorted by revenue. |
| R9 | Compare revenue report total to Billing paid invoices manually for same range. | Numbers match. |
| R10 | Dashboard utilization KPI vs utilization report for current month. | Consistent methodology (both use completed session time). |

### Edge cases

- `from` after `to` — validation error.
- Single-day range.
- Range spanning month/year boundaries.
- Client with bookings but no revenue — still appears if activity exists.
- CSV export while offline — error message.

### Possible bugs to watch for

- UTC date boundaries shift daily breakdown vs user-selected dates.
- Utilization exceeds 100% (math bug).
- Client activity double-counts or misses linked bookings.
- CSV export auth failure silently downloads HTML error page.
- Large date ranges slow or timeout.

---

## 9. Desktop App

**Platform:** Tauri 2 · Routes: `#/`, `#/studios`, `#/clients` (+ client CRUD)

### Manual test cases

| # | Steps | Expected result |
|---|---|---|
| DT1 | Launch desktop app (`tauri dev` or built binary). | Window opens; sidebar and header render. |
| DT2 | Sign in via header (online). | Dashboard loads live KPIs from API. |
| DT3 | Navigate: Dashboard, Studios, Clients. | All three routes work. |
| DT4 | Attempt Calendar, Sessions, Billing, Reports nav items. | Disabled or “Coming soon” / web-only messaging — not full CRUD. |
| DT5 | Create/edit/delete client while online. | Persists via API; visible on web after refresh. |
| DT6 | Create studio on desktop. | Visible on web and in calendar studio dropdown. |
| DT7 | Go offline (disable network) while signed in. | Dashboard shows offline message; no silent stale success. |
| DT8 | Studio sync (M11): create studio offline on desktop, reconnect. | Sync push/pull works for studios (regression on Phase 2 feature). |
| DT9 | AI studio summary (if exposed in desktop UI). | Mock/live summary generates without crash. |

### Edge cases

- App restart preserves sign-in tokens (if implemented in token store).
- Hash routing: refresh on `#/clients` does not 404.
- Window resize / small viewport — layout remains usable.
- API on different host/port — configure base URL if applicable.

### Possible bugs to watch for

- Desktop shows web-only modules as enabled but routes missing (404).
- Online-only client CRUD fails without clear error when offline.
- Sync conflicts after creating same studio on web and desktop offline.
- CORS or localhost URL mismatch between Tauri webview and API.

---

## 10. API (Integration & Regression)

**Base URL:** `http://localhost:4000` (or `API_PORT`)

### Manual test cases

| # | Steps | Expected result |
|---|---|---|
| API1 | `GET /health` | `200`; health payload. |
| API2 | Run `bash apps/api/scripts/ci-smoke.sh` with API running. | All smokes pass (auth, sync, AI, dashboard, clients, bookings, sessions, invoices, reports). |
| API3 | Run against PostgreSQL (`NODE_ENV=production`, `DATABASE_URL` set) in CI or locally. | Migrations apply; postgres-integration smokes pass. |
| API4 | Validation errors: POST with invalid body to each module. | `400` with `VALIDATION_ERROR` and field details. |
| API5 | Not found: GET `/clients/fake-id` with valid JWT. | `404 NOT_FOUND`. |
| API6 | Auth refresh: POST `/auth/refresh` with valid refresh token. | New access + refresh tokens. |
| API7 | Sync: POST `/sync/studios/push` and GET `/sync/studios` with JWT. | Push idempotent; pull returns changes. |
| API8 | AI: POST `/ai/studios/summary` with JWT and mock provider. | Summary returned; `401` without token. |
| API9 | Reports CSV: `GET /reports/revenue/export?from=…&to=…` with JWT. | `Content-Type: text/csv`; valid CSV body. |
| API10 | Error envelope shape on all failures. | `{ success: false, statusCode, error, message, details?, path, timestamp }`. |

### Edge cases

- Missing `AUTH_SECRET` or short secret — server fails startup validation.
- SQLite vs PostgreSQL schema drift — migrate both providers.
- Large list endpoints with `pageSize` at max (100).
- Concurrent booking conflict requests (race).

### Possible bugs to watch for

- Smoke scripts pass on SQLite but fail on PostgreSQL (provider-specific queries).
- Prisma client not regenerated after schema change.
- JWT expiry not enforced on protected routes.
- Unhandled 500 on malformed JSON body.
- CORS blocking web app in non-proxy deployment.

---

## Cross-module end-to-end flows

Run these full journeys after individual module tests pass.

| # | Flow | Expected result |
|---|---|---|
| E2E1 | Sign in → Create studio → Create client → Book session on calendar → Start & complete session → Create invoice from session → Send → Mark paid → Check dashboard & reports | All steps succeed; dashboard KPIs and reports reflect paid revenue and utilization |
| E2E2 | Sign in → Create client → Ad hoc invoice → Pay → Export revenue CSV | CSV total matches invoice total |
| E2E3 | Desktop sign in → Create client → Web refresh clients list | Same client visible on both platforms |
| E2E4 | Cancel booking that had linked session | No orphaned inconsistent state; session/booking links still navigable |
| E2E5 | Soft-delete client used in historical invoice | Historical invoice still readable; client not in active dropdowns |

---

## Sign-off checklist

| Area | Tester | Date | Pass / Fail | Notes |
|---|---|---|---|---|
| Authentication | | | | |
| Dashboard | | | | |
| Studios | | | | |
| Clients | | | | |
| Calendar | | | | |
| Sessions | | | | |
| Billing | | | | |
| Reports | | | | |
| Desktop | | | | |
| API / CI smokes | | | | |
| E2E flows | | | | |

**V1 release recommendation:** All critical paths (E2E1, E2E2) pass on web with API on both SQLite (dev) and PostgreSQL (staging). Desktop pass covers dashboard, studios, and clients online. Document any known limitations (web-only calendar/sessions/billing/reports, manual payment tracking, no Stripe).

---

*Generated after Phase 3 completion (M19). Aligns with implementation through commit `e567f45`.*
