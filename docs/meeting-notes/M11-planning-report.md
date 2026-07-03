# M11 Planning Report — Embedded SQLite and Background Sync

- Date: 2026-07-03
- Milestone: M11 (Embedded SQLite and Background Sync)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md), [docs/roadmap/milestones.md](../roadmap/milestones.md), [ADR 0001](../system-architecture/adr/0001-desktop-local-data-access-strategy.md), [ADR 0002](../system-architecture/adr/0002-authentication-provider.md), M7/M10 planning and implementation reports
- Status: **Planning only — no application code, dependencies, scaffolding commands, or commits have been generated.** Awaiting approval before implementation.

**Note on source documents:** `roadmap/milestones/M11.md` does not exist in this repository. M11 scope is taken verbatim from `docs/roadmap/phase2-roadmap.md` §M11 and the duplicate entry in `docs/roadmap/milestones.md`.

## 1. Current Repository State

Repository history after M10 (`e73aaee`):

```
526a818 refactor: make packages/utils Studio-specific, add M0+M1 implementation report
c48f8ba feat(database): implement Prisma 7 database layer                    (M2)
5a337c2 feat(api): bootstrap NestJS API with health endpoint                  (M3)
e4ec488 feat(contracts,sdk): add Studio API contracts and SDK thread          (M4)
5e9e616 feat(api): implement Studio CRUD feature module                       (M5)
957abcd feat(ui): implement theme tokens, Tailwind v4 preset, and shared UI primitives (M6)
c22bc85 feat(desktop): bootstrap Tauri 2 shell with Studio list/create        (M7)
87a9f7d feat(web): bootstrap Next.js portal with Studio list/create           (M8)
de825df feat(logging,storage): wire structured logging and local storage adapter (M9)
e73aaee feat(auth): implement custom JWT authentication and protect Studio create (M10)
```

What exists and is real going into M11:

- **`apps/desktop`** (M7 + M10): Tauri 2 + Vite + React shell with hash-router Studios screen. **Online-only data path** — `StudiosPage` calls `studiosApi.listStudios()` / `studiosApi.createStudio()` over HTTP via dev Vite proxy. Header `header-actions` slot has M10 login/logout. **`src-tauri/src/lib.rs` has no custom commands and no SQLite crates.** No sync/offline code.
- **`apps/web`** (M8 + M10): Same Studio feature online-only via Next.js rewrites. **Not in M11 Definition of Done** (desktop offline sync only).
- **`apps/api`** (M3–M10): `GET /health`, `GET /studios` (public), `POST /studios` (JWT protected), `POST /auth/login`, `POST /auth/refresh`. **No sync module or `/sync` routes.** `StudiosRepository.create()` accepts `{ name }` only — Prisma generates `id` via `@default(cuid())` (M5 decision).
- **`packages/database`** (M2 + M10): Dual Prisma schemas (`Studio`, `User`). SQLite migrations: `20260702105345_init`, `20260703083416_add_user`. PostgreSQL migration set has `studios` init only — **`users` table in PG schema but PG user migration may lag M10** (known M10 implementation note). SQLite client exported via `createSqlitePrismaClient()` — consumed by `apps/api` in dev only, **not by desktop**.
- **`packages/events`**: scaffolding only — README + empty `package.json`/`tsconfig.json`, **no `src/` files**. Root `pnpm typecheck` still fails here (`TS18003`).
- **`packages/contracts` / `packages/api-sdk`**: Studio + auth DTOs/APIs only. **No sync contracts or SDK methods.**
- **`packages/constants`**: `ROUTES.AUTH`, `ROUTES.STUDIOS` only — no `SYNC` route key.
- **ADR 0001**: online-only accepted for M0–M10; **Rust-native SQLite vs Node sidecar explicitly deferred to M11** (`rusqlite`/`sqlx` named as lead candidate).
- **ADR 0002**: custom JWT accepted (M10); sync push will reuse Bearer auth + refresh hook from `packages/api-sdk`.

What is pure scaffolding today (M11 targets):

```
packages/events/                    (no src/ — README only)
apps/api/src/modules/sync/          (does not exist yet)
apps/desktop/src/lib/sync-engine.ts (does not exist yet)
apps/desktop/src-tauri/db/          (does not exist yet — Rust SQLite layer)
```

**Product bible note:** `docs/product-bible/README.md` remains index-only. M11 scope is the roadmap's verbatim Definition of Done: **offline Studio create in desktop persists locally and syncs to the server without loss or duplication.** No speculative multi-entity sync, web offline, or full conflict-resolution UI.

## 2. M11 Goal (from the Roadmap, Verbatim Scope)

> **Goal:** deliver on the "offline-capable desktop" promise from the frozen architecture.
>
> - Resolve the concrete implementation of the M0 ADR (Rust-native SQLite vs Prisma sidecar) now that a working online app exists to build offline support on top of.
> - Local SQLite schema mirroring the `Studio` model (and future models) via `packages/database`'s SQLite provider variant.
> - `packages/events` domain events for change tracking (`StudioCreatedLocally`, etc.).
> - Sync engine in `apps/desktop` (background task) and corresponding sync endpoints in `apps/api`.
>
> **Depends on:** M7 (working online desktop app), M2, M10 (sync likely needs authenticated requests).
>
> **Definition of done:** creating a Studio while offline in the desktop app persists locally and syncs to PostgreSQL once connectivity returns, without data loss or duplication.

**Scope interpretation (strict):**

- **In scope:** ADR 0001 follow-up decision; embedded local SQLite in desktop (Studio table + sync metadata); `packages/events` domain event names/payloads; `apps/api` sync module (authenticated push + pull for Studio); `packages/contracts` + `packages/validation` + `packages/api-sdk` sync thread; desktop local-first Studios read/write via Tauri commands; JS sync engine that pushes pending local changes and pulls server updates when online + authenticated; e2e offline→online validation.
- **Out of scope:** Web offline/PWA; Node sidecar (unless explicitly chosen in open decision #1); Prisma Client running inside desktop; User entity sync; soft delete (ADR 0003); multi-field Studio updates/conflict UI; sync while app process is fully quit (true OS background); RBAC beyond existing JWT; AI (M12); CI (M13); changes unrelated to Studio offline sync.

M11 **requires desktop + API changes** and **touches `packages/events` for the first time**. Web may receive **cosmetic-only** sync-status documentation at most — not offline behavior.

## 3. ADR 0001 Resolution (Desktop Local Data Access)

ADR 0001 deferred the hard offline decision to M11. For M11 planning, the **recommended decision** is:

| Option | M11 recommendation | Rationale |
|---|---|---|
| **Rust-native SQLite** (`rusqlite` + Tauri commands) | **Recommended** | ADR 0001 lead candidate; no bundled Node runtime; self-contained Tauri binary; matches production Tauri deployment model; SQLite access stays on the Rust side where file locking and migrations belong. |
| **Node sidecar with Prisma** | Not recommended for M11 | Reuses `packages/database` Prisma client directly but adds per-platform Node bundling, a second process, IPC complexity, and packaging cost disproportionate to one Studio entity. |
| **Stay online-only** | Not applicable | Explicitly superseded by M11 roadmap milestone. |

**Deliverable:** update [ADR 0001](../system-architecture/adr/0001-desktop-local-data-access-strategy.md) status from **"Accepted (M0–M7); to be revisited before M11"** to **"Accepted — Rust-native SQLite (rusqlite) for desktop local store; HTTP sync to apps/api"**, documenting:

- Canonical **field shapes** sourced from `packages/database/prisma/sqlite/schema.prisma` (`Studio` model).
- Rust SQL migrations live under `apps/desktop/src-tauri/migrations/` (or equivalent) — **not** Prisma running in the desktop process.
- `packages/database`'s SQLite Prisma schema remains the **API dev/test** path only until a future codegen bridge is justified.

**Pre-implementation spike (recommended, ≤ half day):** add `rusqlite` to `src-tauri/Cargo.toml`, open/create a file DB, run one `CREATE TABLE` + `INSERT` + Tauri `invoke` round-trip from React. Abort to sidecar only if spike reveals a blocker (unlikely).

No new ADR file required unless review prefers ADR 0004; updating ADR 0001 in place avoids numbering collision with ADR 0003.

## 4. Local SQLite Schema (Desktop)

Mirror the existing Prisma `Studio` model from `packages/database/prisma/sqlite/schema.prisma`, plus **sync metadata** required for M11 (not in server schema yet):

### 4.1 `studios` table (local)

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | Client-generated `cuid` at offline create time (see §6) |
| `name` | `TEXT NOT NULL` | Same as server |
| `created_at` | `TEXT NOT NULL` | ISO-8601 UTC |
| `updated_at` | `TEXT NOT NULL` | ISO-8601 UTC |
| `sync_status` | `TEXT NOT NULL` | `pending` \| `synced` \| `failed` |
| `last_sync_error` | `TEXT NULL` | Set when push fails |

**Not synced in M11:** `User` — auth remains M10 `localStorage` tokens; offline create is allowed locally without live API auth; push requires valid JWT when online.

### 4.2 `sync_state` table (local metadata)

| Column | Type | Notes |
|---|---|---|
| `key` | `TEXT PRIMARY KEY` | e.g. `studios_last_pulled_at` |
| `value` | `TEXT NOT NULL` | ISO-8601 cursor or JSON |

### 4.3 Rust access layer

```
apps/desktop/src-tauri/src/
  db/
    mod.rs              # connection pool / app-data-dir path
    migrations.rs       # versioned SQL migrations (v1 = studios + sync_state)
    studios.rs          # CRUD queries
  commands/
    studios.rs          # Tauri commands: list_local_studios, create_local_studio, get_sync_status
```

- DB file path: Tauri `app_data_dir` + `st-manager.db` (document in README).
- Migrations run once on app startup (`PRAGMA user_version` or `refinery`/`rusqlite_migration` — keep minimal; raw SQL acceptable for one migration).

### 4.4 Relationship to `packages/database`

The roadmap phrase "via `packages/database`'s SQLite provider variant" means **schema parity**, not **runtime reuse**:

- **Source of truth for field names/types:** `packages/database/prisma/sqlite/schema.prisma`.
- **Consumer in M11:** Rust `rusqlite` in `apps/desktop/src-tauri`, manually kept in sync.
- **Optional doc addition:** comment block in `schema.prisma` pointing to Rust migration file (no codegen in M11).

## 5. `packages/events` — Domain Events

First real implementation of the scaffold package. Keep it **types + constants only** — no runtime event bus, no NestJS integration yet.

### 5.1 Layout

```
packages/events/src/
  domain/
    event-names.ts          # EVENT_NAMES.STUDIO_CREATED_LOCALLY, etc.
    studio.events.ts        # payload interfaces
  index.ts
```

### 5.2 Events (M11 minimum)

| Event name | Payload | Emitted when |
|---|---|---|
| `StudioCreatedLocally` | `{ id, name, createdAt, updatedAt }` | Local SQLite insert succeeds (offline or online-local-first) |
| `StudioSyncPushSucceeded` | `{ id, name }` | Pending row successfully pushed to API |
| `StudioSyncPushFailed` | `{ id, error }` | Push attempt failed (network/auth/validation) |
| `SyncPullCompleted` | `{ pulledCount, cursor }` | Server pull merged into local DB |
| `SyncCycleCompleted` | `{ pushed, pulled, failed }` | End of one sync engine iteration |

**Handler interfaces:** export a minimal `DomainEventHandler<T>` type in `src/handlers/` for future use; **M11 desktop sync engine may import payload types directly** without a full pub/sub framework.

### 5.3 Build

Add `build` script (`tsc`, CommonJS like M9 `logging` if consumed from Nest later — for M11, desktop imports types via workspace TS path; still add `main`/`types`/`exports` so root typecheck passes).

## 6. Sync Protocol — API Endpoints

M5 intentionally rejects client-supplied IDs on `POST /studios`. M11 introduces **dedicated sync endpoints** so the public create contract stays unchanged.

### 6.1 Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/sync/studios/push` | JWT | Idempotent upsert of client-created studios |
| `GET` | `/sync/studios` | JWT | Incremental pull (`?since=<ISO8601>`) |

Add `ROUTES.SYNC = "sync"` (or `ROUTES.SYNC_STUDIOS`) to `packages/constants`.

### 6.2 Push contract

**Request body** (batch — allows one round-trip for multiple pending rows):

```ts
interface SyncStudiosPushRequestDto {
  studios: Array<{
    id: string;        // client-generated cuid — becomes server PK
    name: string;
    createdAt: string; // ISO-8601
    updatedAt: string; // ISO-8601
  }>;
}
```

**Response:**

```ts
interface SyncStudiosPushResponseDto {
  results: Array<{
    id: string;
    status: "created" | "updated" | "unchanged";
  }>;
}
```

**Server behavior (recommended):**

- For each item: `upsert` by `id` — if row exists with same `id`, update `name`/`updatedAt` only if server `updatedAt` ≤ client `updatedAt` (last-write-wins baseline).
- If row exists with same `id` and identical fields → `unchanged` (safe retry — **prevents duplication** on sync retry).
- Validates `name` via existing `createStudioSchema` rules.
- All routes JWT-protected (`JwtAuthGuard`).

### 6.3 Pull contract

**Query:** `GET /sync/studios?since=2026-07-03T00:00:00.000Z` (optional — omit or epoch for full list)

**Response:**

```ts
interface SyncStudiosPullResponseDto {
  studios: StudioResponseDto[];
  serverTime: string; // ISO-8601 — client stores as next cursor
}
```

**Server behavior:** return all studios where `updatedAt > since`, ordered by `updatedAt asc`, capped (e.g. 500 — reuse pagination constants pattern).

### 6.4 API module layout

```
apps/api/src/modules/sync/
  sync.module.ts
  sync.controller.ts
  sync.service.ts
  sync.repository.ts       # reuses Prisma Studio delegate; upsert + findUpdatedSince
```

Register `SyncModule` in `AppModule`. `SyncModule` imports `AuthModule`.

## 7. `packages/contracts`, `packages/validation`, `packages/api-sdk`

### 7.1 Contracts

New files under `packages/contracts/src/sync/`:

- `sync-studios-push.dto.ts`
- `sync-studios-pull.dto.ts`

Export from `packages/contracts/src/index.ts`.

### 7.2 Validation

New files under `packages/validation/src/sync/`:

- `sync-studios-push.schema.ts` — array min 1, max batch size (e.g. 50), each item validates id/name/dates.
- `sync-studios-pull.schema.ts` — optional `since` ISO datetime.

### 7.3 api-sdk

```
packages/api-sdk/src/sync/sync.api.ts   # createSyncApi(client): { pushStudios, pullStudios }
```

Wire into `packages/api-sdk/src/index.ts`. Reuses existing `getAuthHeaders` + `onUnauthorized` from M10 — **sync calls require authenticated session**.

## 8. Desktop Sync Engine and UI Changes

### 8.1 Architecture (recommended)

```
React (StudiosPage)
  └─ invoke Tauri commands ──► Rust (rusqlite local DB)
  
React (sync-engine.ts)
  └─ createSyncApi + tokenStore ──► HTTP ──► apps/api /sync/*
       ▲
       └── reads/writes local DB via Tauri commands (mark pending/synced)
```

**Why JS sync engine (not Rust HTTP):** reuses M10 `api-sdk` auth + refresh; avoids duplicating JWT logic in Rust for one milestone. Rust owns persistence; TypeScript owns network.

### 8.2 Sync engine behavior

File: `apps/desktop/src/lib/sync-engine.ts`

**Triggers:**

1. `window` `online` event
2. After successful local create (if online + authenticated)
3. Periodic interval (e.g. 30s) while app focused, online, and authenticated
4. Manual "Sync now" control (optional but aids validation)

**One cycle:**

1. **Push:** load local rows with `sync_status = pending` via Tauri command → `syncApi.pushStudios()` → on success mark `synced`, on failure mark `failed` + store error.
2. **Pull:** read `studios_last_pulled_at` cursor → `syncApi.pullStudios({ since })` → merge into local DB (insert new, update existing if server `updatedAt` newer) → update cursor to `serverTime`.
3. Emit typed events (import from `@st-manager/events`) for logging/dev.

**Offline create flow:**

1. User authenticated locally (tokens in `localStorage` from prior session) **or** not — **local create allowed regardless** (offline-first).
2. `create_local_studio` Tauri command generates `cuid` (Rust crate `cuid2` or invoke from TS before command — pick one, document).
3. Insert with `sync_status = pending`.
4. UI updates immediately from local list.
5. When online + authenticated, sync engine pushes.

### 8.3 StudiosPage refactor

Switch from direct `studiosApi` calls to **local-first**:

| Action | M10 behavior | M11 behavior |
|---|---|---|
| List | `studiosApi.listStudios()` | `invoke("list_local_studios")` |
| Create (authenticated) | `studiosApi.createStudio()` | `invoke("create_local_studio")` + enqueue sync |
| Error when offline | Network error from api-sdk | Local write succeeds; sync status shown separately |

Keep `studiosApi` import for sync engine only (or exclusively via `syncApi`).

### 8.4 Header sync indicator (recommended)

Use remaining space in `header-actions` (beside login):

- `Offline` / `Syncing…` / `Synced` / `N pending` — driven by `navigator.onLine`, sync engine state, pending count Tauri command.

M7/M8 planning reserved this slot for future status indicators — M11 is the first real use.

### 8.5 TypeScript Tauri bindings

Add typed invoke wrappers in `apps/desktop/src/lib/tauri/studios.ts` (or `@tauri-apps/api/core` invoke with shared types matching Rust serde structs).

## 9. Folder Structure Summary

**New:**

```
packages/events/src/domain/*.ts
packages/events/src/handlers/*.ts
packages/events/src/index.ts
packages/contracts/src/sync/*.ts
packages/validation/src/sync/*.ts
packages/api-sdk/src/sync/sync.api.ts
apps/api/src/modules/sync/*
apps/api/scripts/sync-smoke.sh
apps/desktop/src-tauri/src/db/*
apps/desktop/src-tauri/src/commands/studios.rs
apps/desktop/src/lib/sync-engine.ts
apps/desktop/src/lib/tauri/studios.ts
apps/desktop/src/hooks/useSyncStatus.ts
docs/meeting-notes/M11-implementation-report.md  (at implementation time)
```

**Modified:**

- `docs/system-architecture/adr/0001-desktop-local-data-access-strategy.md`
- `packages/database/prisma/sqlite/schema.prisma` (comment cross-ref only — optional)
- `packages/constants/src/routes.ts`
- `packages/contracts/src/index.ts`
- `packages/validation/src/index.ts`
- `packages/api-sdk/src/index.ts`, README
- `apps/api/src/app.module.ts`
- `apps/desktop/src-tauri/Cargo.toml`, `src/lib.rs` (register commands + DB init)
- `apps/desktop/src/app/studios/StudiosPage.tsx`
- `apps/desktop/src/app/shell/Header.tsx`
- `apps/desktop/README.md`
- `pnpm-lock.yaml`

**Explicitly not modified:** `apps/web` offline behavior; `POST /studios` contract; User model; `packages/ui` beyond reuse; `packages/storage` feature wiring.

## 10. Dependencies Required and Justification

| Package | Dependency | Type | Why |
|---|---|---|---|
| `apps/desktop/src-tauri` | `rusqlite` | dependency | Embedded SQLite |
| `apps/desktop/src-tauri` | `serde`, `serde_json` | dependency | Tauri command payloads (likely already transitive) |
| `apps/desktop/src-tauri` | `cuid2` or `uuid` | dependency | Client-generated studio IDs |
| `packages/events` | `typescript` | devDependency | First real build |
| `apps/api` | (none new npm) | — | Reuses Prisma + auth stack |
| `packages/api-sdk` | (none new npm) | — | Native fetch unchanged |

## 11. Risks

1. **Schema drift** — Rust SQL and Prisma SQLite schemas diverge over time. Mitigation: single migration in M11, cross-reference comment in Prisma schema, sync smoke test.
2. **ID strategy change vs M5** — M5 forbids client IDs on `POST /studios`; M11 adds separate sync upsert path. Mitigation: do not loosen `POST /studios`; document in ADR 0001 amendment.
3. **Duplicate studios on retry** — Mitigation: idempotent upsert by `id` + `unchanged` status; integration test in smoke script.
4. **Auth expired while offline** — User creates locally, comes online with expired refresh token. Mitigation: push fails with 401 → `failed` status + header prompt to re-login; data not lost locally.
5. **Pull overwrite** — Server studio updated while client offline-edited same id (unlikely in M11 single-user dev). Mitigation: last-write-wins by `updatedAt`; no conflict UI in M11.
6. **PostgreSQL `users` migration gap** — API prod uses PostgreSQL; sync endpoints need JWT, not User table migration, but prod deploy should apply pending PG migrations before M11 validation in prod-like env.
7. **Root `pnpm typecheck`** — implementing `packages/events` should **fix** its `TS18003` failure; validate M11 packages in isolation regardless.
8. **Tauri dev vs prod paths** — SQLite file location differs; document and test both `$tauri dev` and `$tauri build` smoke if feasible.

## 12. Validation Strategy

1. `pnpm install` — after Rust crate and events package build additions.
2. `pnpm --filter @st-manager/events build` + typecheck — pass (first real exports).
3. `pnpm --filter @st-manager/{contracts,validation,constants,api-sdk,api} build` + isolated typecheck — pass.
4. `cargo check` / `pnpm --filter @st-manager/desktop tauri build` (or `tauri dev` compile) — Rust DB layer compiles.
5. `pnpm lint` — zero new errors/warnings.
6. **API sync smoke:**

   ```bash
   pnpm --filter @st-manager/api dev
   pnpm --filter @st-manager/database db:seed:dev
   bash apps/api/scripts/sync-smoke.sh
   ```

   Script should: login → push studio with client id → verify `GET /studios` contains it → push same id again → count unchanged → pull with `since` cursor.

7. **End-to-end (Definition of Done):**

   ```bash
   # Terminal 1 — API running
   pnpm --filter @st-manager/api dev

   # Terminal 2 — desktop
   pnpm --filter @st-manager/desktop tauri dev
   ```

   - Sign in while online (seed credentials).
   - Stop API (simulate offline).
   - Create studio in desktop → appears in local list immediately.
   - Restart API.
   - Sync runs (automatic or manual) → `GET /studios` (curl) includes the studio **exactly once**.
   - Re-run sync → still exactly one row (no duplication).
   - Local row `sync_status` → `synced`.

8. `pnpm build` (root) — no regression.
9. Optional screenshot: `docs/meeting-notes/assets/m11-offline-sync.png`.

## 13. Definition of Done

- [ ] ADR 0001 updated to **Accepted — Rust-native SQLite** for desktop local store.
- [ ] Desktop embedded SQLite with `studios` + sync metadata; Tauri commands for list/create.
- [ ] `packages/events` exports M11 domain event names and payload types; builds and typechecks.
- [ ] `POST /sync/studios/push` and `GET /sync/studios` implemented with JWT auth, contracts, validation alignment.
- [ ] `packages/api-sdk` exposes `createSyncApi` with `pushStudios` / `pullStudios`.
- [ ] Desktop sync engine pushes pending local creates and pulls server updates when online + authenticated.
- [ ] Offline create persists locally; online sync completes without data loss or duplication.
- [ ] `pnpm lint` and `pnpm build` pass; M11 packages typecheck in isolation.
- [ ] `docs/meeting-notes/M11-implementation-report.md` written at implementation time.
- [ ] Nothing committed until implementation report is reviewed and approved.

## 14. Next Recommended Milestone

**M12 — First AI Feature Slice.** Depends on M5/M7/M8; independent of M11 sync completion for web, but desktop will now be local-first for Studio data.

---

**Open decisions requiring explicit approval before implementation** (summarized for one-pass review):

1. **Local data access (ADR 0001):** **Rust-native SQLite via `rusqlite` + Tauri commands** (recommended) vs. **Node sidecar running Prisma**.

2. **Desktop data source for UI:** **Local-first** — list/create always hit embedded SQLite; sync engine reconciles with server (recommended) vs. **Online-primary with offline fallback** — keep `studiosApi` as primary, SQLite as cache only.

3. **Client ID strategy on sync push:** **Client-generated `cuid` as server primary key** via `/sync/studios/push` idempotent upsert (recommended — simplest dedup story) vs. **Server-assigned IDs** with local→remote mapping table (more moving parts).

4. **Sync engine location:** **TypeScript sync engine** reusing `packages/api-sdk` auth (recommended) vs. **Rust HTTP client** in Tauri (duplicates JWT/refresh logic).

5. **Conflict baseline on pull/push:** **Last-write-wins by `updatedAt`** (recommended for M11 single-user dev) vs. **Server always wins** (client pending changes may be overwritten without merge).

6. **Web app scope:** **No web changes** — M11 DoD is desktop-only (recommended) vs. **Add read-only "sync not available on web" note** in web UI.

7. **Sync triggers:** **Automatic** on `online` event + interval while authenticated (recommended) **plus** optional manual "Sync now" vs. **Manual sync only** (simpler but weaker DoD demo).

Stopping here per instructions — no source code, dependencies, scaffolding commands, or commits have been touched. Awaiting review and approval of this plan (and the seven decisions above) before implementing M11.
