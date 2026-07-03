# M11 Implementation Report — Embedded SQLite and Background Sync

- Status: Implemented, validated, **not committed** (awaiting review per instructions)
- Base: M10 (`e73aaee`), committed
- Date: 2026-07-03
- Scope: Rust-native desktop SQLite, sync API endpoints, `packages/events`, desktop sync engine, local-first Studios UI, ADR 0001 update, and this report. No M12 work. No web offline changes.
- Source: [M11 planning report](./M11-planning-report.md) (approved as written, including all seven recommended open decisions)

## 1. Executive Summary

M11 delivers the **offline-capable desktop** milestone: embedded SQLite in Tauri (`rusqlite`), local-first Studio list/create via Tauri commands, authenticated **push/pull sync** through new `/sync/studios/*` API routes, and a TypeScript sync engine reusing M10 JWT auth from `packages/api-sdk`.

All seven open decisions from the planning report were applied as recommended:

1. **Rust-native SQLite** via `rusqlite` + Tauri commands (not Node sidecar).
2. **Local-first UI** — list/create always hit embedded SQLite; sync reconciles with server.
3. **Client-generated `cuid`** as server primary key on sync push (idempotent upsert).
4. **TypeScript sync engine** reusing `packages/api-sdk` auth (not Rust HTTP).
5. **Last-write-wins by `updatedAt`** on pull merge (pending local rows preserved).
6. **No web changes** — desktop-only Definition of Done.
7. **Automatic sync** on `online` event + 30s interval while focused/authenticated, plus manual **Sync now** button.

Two implementation-time fixes were required: **Rust naming conflict** (`get_sync_status` command vs db helper — renamed db helper to `build_sync_status`), and **React hooks lint** (`set-state-in-effect`) in `StudiosPage` and `useSyncStatus`.

## 2. Files Created

**`packages/events/`**

- `src/domain/event-names.ts` — `EVENT_NAMES` constants.
- `src/domain/studio.events.ts` — M11 payload interfaces.
- `src/handlers/domain-event-handler.ts` — `DomainEventHandler<T>` type.
- `src/index.ts` — public exports.

**`packages/contracts/src/sync/`**

- `sync-studios-push.dto.ts` — push request/response DTOs.
- `sync-studios-pull.dto.ts` — pull query/response DTOs.

**`packages/validation/src/sync/`**

- `sync-studios-push.schema.ts` — batch push validation (max 50).
- `sync-studios-pull.schema.ts` — optional `since` ISO datetime.

**`packages/api-sdk/src/sync/`**

- `sync.api.ts` — `createSyncApi` with `pushStudios`, `pullStudios`.

**`apps/api/`**

- `src/modules/sync/sync.module.ts`, `sync.controller.ts`, `sync.service.ts`, `sync.repository.ts`
- `scripts/sync-smoke.sh` — curl-based sync regression script.

**`apps/desktop/`**

- `src-tauri/src/db/mod.rs`, `migrations.rs`, `studios.rs` — rusqlite layer.
- `src-tauri/src/commands/mod.rs`, `commands/studios.rs` — Tauri invoke handlers.
- `src-tauri/Cargo.lock` — new Rust dependencies locked.
- `src/lib/tauri/studios.ts` — typed invoke wrappers.
- `src/lib/sync-engine.ts` — push/pull sync cycle + event emission.
- `src/hooks/useSyncStatus.ts` — sync status hook for header UI.
- `src/components/sync/SyncProvider.tsx`, `SyncStatusIndicator.tsx`

**`docs/`**

- `meeting-notes/M11-implementation-report.md` (this file).

## 3. Files Modified

- `docs/system-architecture/adr/0001-desktop-local-data-access-strategy.md` — **Accepted — Rust-native SQLite**.
- `packages/database/prisma/sqlite/schema.prisma` — cross-ref comment to Rust migrations.
- `packages/constants/src/routes.ts` — `ROUTES.SYNC`.
- `packages/constants/src/limits.ts` — `SYNC.MAX_PUSH_BATCH`, `SYNC.MAX_PULL_BATCH`.
- `packages/contracts/src/index.ts`, `packages/validation/src/index.ts`, `packages/api-sdk/src/index.ts`, README.
- `packages/events/package.json`, `tsconfig.json`, README — first real build.
- `apps/api/src/app.module.ts` — register `SyncModule`.
- `apps/desktop/src-tauri/Cargo.toml` — `rusqlite`, `cuid2`, `chrono`.
- `apps/desktop/src-tauri/src/lib.rs` — DB init + command registration.
- `apps/desktop/src/App.tsx` — wrap with `SyncProvider`.
- `apps/desktop/src/app/studios/StudiosPage.tsx` — local-first list/create.
- `apps/desktop/src/app/shell/Header.tsx` — sync status indicator.
- `apps/desktop/src/lib/api-client.ts` — export `syncApi`.
- `apps/desktop/vite.config.ts` — `/sync` proxy + `@st-manager/events` alias.
- `apps/desktop/package.json` — `@st-manager/events` dependency.
- `apps/desktop/README.md` — local DB + sync documentation.
- `pnpm-lock.yaml`

**Unchanged (as planned):** `apps/web` offline behavior; `POST /studios` contract; User sync; `packages/ui` beyond reuse.

## 4. Dependencies Added (Resolved Versions)

| Package | Dependency | Type | Resolved version |
|---|---|---|---|
| `apps/desktop/src-tauri` | `rusqlite` | dependency | 0.32.1 |
| `apps/desktop/src-tauri` | `cuid2` | dependency | 0.1.6 |
| `apps/desktop/src-tauri` | `chrono` | dependency | 0.4.45 |
| `apps/desktop` | `@st-manager/events` | dependency (workspace) | link |
| `packages/events` | `typescript` | devDependency | 6.0.3 |

No new npm dependencies in `apps/api` or `packages/api-sdk`.

## 5. Approved Architectural Decisions Applied

| Decision (planning report §14) | Choice applied |
|---|---|
| Local data access | Rust `rusqlite` + Tauri commands |
| Desktop data source | Local-first SQLite; sync engine reconciles |
| Client IDs | `cuid2` in Rust; idempotent upsert on push |
| Sync engine | TypeScript + `createSyncApi` + M10 JWT |
| Conflict baseline | Last-write-wins by `updatedAt`; skip pull overwrite for `pending` rows |
| Web scope | No web changes |
| Sync triggers | Auto on `online` + 30s interval + manual Sync now |

## 6. Deviations From Plan (Justified)

### 6.1 Rust `get_sync_status` naming conflict

**Plan assumption:** Tauri command and db helper can share naming via module paths.

**Reality:** Importing `get_sync_status` from `db::studios` into `commands/studios.rs` collided with the Tauri command fn name; Rust E0255.

**Fix:** Renamed db helper to `build_sync_status`; Tauri command remains `get_sync_status`.

### 6.2 `SyncProvider` import paths

**Plan assumption:** relative imports from `components/sync/`.

**Reality:** Initial paths used `../hooks` (one level short); desktop `tsc` failed.

**Fix:** Corrected to `../../hooks/useAuth` and `../../lib/sync-engine`.

### 6.3 React hooks lint in load effects

**Plan assumption:** standard `useEffect` + `loadStudios()` on mount.

**Reality:** ESLint `react-hooks/set-state-in-effect` flagged synchronous `setIsLoading(true)` inside `loadStudios()` when called from effects.

**Fix:** Inline async fetch in effects with `setState` only in `.then`/`.finally` callbacks; sync subscription calls `reloadStudios()` from external callback.

## 7. Validation Results

### 7.1 Package builds and typechecks

| Check | Result |
|---|---|
| `pnpm install` | **Pass** |
| `pnpm --filter @st-manager/events build` + `typecheck` | **Pass** |
| `pnpm --filter @st-manager/{constants,contracts,validation,api-sdk,api} build` + `typecheck` | **Pass** |
| `pnpm --filter @st-manager/desktop build` + `typecheck` | **Pass** |
| `cargo check` (`apps/desktop/src-tauri`) | **Pass** |

### 7.2 Repository-wide checks

| Check | Result |
|---|---|
| `pnpm lint` | **Pass** — 0 errors, 0 warnings |
| `pnpm build` (root, 14 tasks) | **Pass** |

### 7.3 API sync smoke

**Setup:**

```bash
pnpm --filter @st-manager/api dev
bash apps/api/scripts/sync-smoke.sh
```

**Result:** **Pass**

```
M11 sync smoke against http://localhost:4000
M11 sync smoke: auth guard, push create, idempotent retry, and pull passed
```

Script verifies: unauthenticated push → 401; login; push with client id → `created`; studio appears in `GET /studios`; retry push → `unchanged`; pull with `since` cursor → success.

### 7.4 Auth regression smoke

| Check | Result |
|---|---|
| `bash apps/api/scripts/auth-smoke.sh` | **Pass** — M10 auth unchanged |

### 7.5 Desktop e2e (Definition of Done)

Full interactive offline→online flow requires **`pnpm --filter @st-manager/desktop tauri dev`** (Tauri invoke commands are not available in plain `vite dev`). Manual checklist:

1. Start API + desktop via `tauri dev`.
2. Sign in (`dev@st-manager.local` / `devpassword`).
3. Stop API — create studio → appears in local list (pending sync).
4. Restart API — sync runs (auto or **Sync now**) → studio appears once in `GET /studios`.
5. Re-sync → no duplicate rows; local `sync_status` → `synced`.

**Automated proxy validation (partial):** desktop Vite `/sync` proxy pattern matches M10 auth proxy (added in `vite.config.ts`). API-level idempotent push proven by sync smoke.

## 8. Risks / Remaining Issues

1. **Schema drift** — Rust SQL and Prisma SQLite must be updated in tandem until codegen exists.
2. **Manual tauri dev e2e** — full DoD offline simulation not automated in CI (M13 scope).
3. **Auth expired after offline create** — push fails with 401; local data retained with `failed` status; user must re-login.
4. **No true OS background sync** — sync runs while app is open/focused per M11 scope.
5. **PostgreSQL `users` migration gap** — unchanged from M10; sync uses JWT only.
6. **Root `pnpm typecheck`** — may still fail on empty scaffolds (`packages/ai`, etc.); M11 packages pass in isolation.

## 9. Definition of Done — Status

- [x] ADR 0001 updated to **Accepted — Rust-native SQLite**.
- [x] Desktop embedded SQLite with `studios` + sync metadata; Tauri commands for list/create.
- [x] `packages/events` exports M11 domain event names and payload types; builds and typechecks.
- [x] `POST /sync/studios/push` and `GET /sync/studios` implemented with JWT auth.
- [x] `packages/api-sdk` exposes `createSyncApi`.
- [x] Desktop sync engine pushes pending creates and pulls server updates when online + authenticated.
- [x] API sync smoke proves idempotent push (no duplication on retry).
- [x] `pnpm lint` and `pnpm build` pass.
- [x] This implementation report written before any commit.
- [x] No git commit or push (per instructions).

## 10. Git Status

Working tree has all M11 changes **uncommitted**, per instructions. Untracked `M6-commit-summary.md`, `M7-commit-summary.md`, and `M11-planning-report.md` remain separately uncommitted.

## 11. Manual Review Checklist (Recommended Before Commit)

1. `pnpm --filter @st-manager/api dev`
2. `bash apps/api/scripts/sync-smoke.sh`
3. `pnpm --filter @st-manager/desktop tauri dev`
4. Execute offline create → online sync flow from §7.5
5. Confirm header shows Offline / N pending / Synced / Sync now states

## 12. Next Recommended Milestone

**M12 — First AI Feature Slice.** Independent of M11; desktop Studio data is now local-first.

---

Stopping here per instructions — nothing has been committed. Awaiting review before any commit.
