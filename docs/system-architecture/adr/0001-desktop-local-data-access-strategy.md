# ADR 0001: Desktop Local Data Access Strategy

- Status: **Accepted — Rust-native SQLite (rusqlite) for desktop local store; HTTP sync to apps/api**
- Date: 2026-07-02 (online-only for M7–M10); updated 2026-07-03 (M11 decision)

## Context

The frozen v3 architecture specifies that `apps/desktop` (Tauri 2 + React) must eventually support offline-capable workflows via an embedded SQLite database with background sync to PostgreSQL through `apps/api`. `packages/database` uses Prisma, which is a Node.js library. Tauri 2 apps ship a Rust binary and a webview frontend; there is no bundled Node.js runtime in a production Tauri build, so the Prisma Client (as used by `apps/api`) cannot run inside the desktop app's Rust process without additional infrastructure.

Three implementation options were considered for how the desktop app reads/writes local data:

1. **Rust-native SQLite** — the Tauri Rust shell (`src-tauri`) owns a local SQLite database directly via a crate such as `rusqlite` or `sqlx`, exposed to the React frontend as Tauri commands. Requires maintaining a schema mirror (or a Rust-side migration story) separate from `packages/database`'s Prisma schema.
2. **Bundled Node sidecar** — package a Node.js process (running the existing Prisma Client) as a Tauri "sidecar" binary, communicating with the Rust shell/React frontend over local IPC or HTTP. Reuses `packages/database` as-is but adds packaging complexity (bundling a Node runtime per platform) and a second long-running process per desktop instance.
3. **Online-only for now** — the desktop app calls `apps/api` over HTTP exactly like `apps/web` does, with no local database at all. Embedded SQLite and background sync are deferred to a dedicated later milestone.

## Decision

**M11 adopts Option 1 (Rust-native SQLite)** via `rusqlite` in `apps/desktop/src-tauri`, with Tauri commands exposing local Studio CRUD to the React frontend.

| Aspect | Choice |
|---|---|
| Local persistence | SQLite file at `{app_data_dir}/st-manager.db` |
| Rust access | `rusqlite` + versioned SQL migrations in `src-tauri/src/db/migrations.rs` |
| Schema source of truth (field shapes) | `packages/database/prisma/sqlite/schema.prisma` — mirrored manually in Rust |
| Network sync | TypeScript sync engine in `apps/desktop` calling `POST /sync/studios/push` and `GET /sync/studios` via `packages/api-sdk` (reuses M10 JWT auth) |
| Client-generated IDs | `cuid2` in Rust at local create time; idempotent upsert on sync push |
| Prisma in desktop | **Not used** — `packages/database` SQLite client remains for `apps/api` dev/test only |

Option 2 (Node sidecar) was evaluated and rejected for M11 — packaging cost outweighs benefit for a single-entity sync slice.

M7–M10 used Option 3 (online-only) intentionally to deliver the walking skeleton first.

## Consequences

- Desktop Studio list/create is **local-first** — reads and writes hit embedded SQLite; sync reconciles with the server when online and authenticated.
- `POST /studios` (M5) remains unchanged (server-generated IDs on direct create). Offline sync uses dedicated `/sync/studios/*` endpoints with client-supplied IDs — no loosening of the public create contract.
- Schema changes to `Studio` must be applied in both `packages/database/prisma/sqlite/schema.prisma` and the Rust migration layer until an automated codegen bridge is justified.
- Web portal (`apps/web`) stays online-only — M11 offline scope is desktop-only per roadmap Definition of Done.
- Managed-provider auth (Clerk/Auth0) remains unrelated; sync uses M10 custom JWT Bearer tokens.
