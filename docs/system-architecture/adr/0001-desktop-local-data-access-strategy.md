# ADR 0001: Desktop Local Data Access Strategy

- Status: Accepted (for Phase 2, M0–M7); to be revisited before M11
- Date: 2026-07-02

## Context

The frozen v3 architecture specifies that `apps/desktop` (Tauri 2 + React) must eventually support offline-capable workflows via an embedded SQLite database with background sync to PostgreSQL through `apps/api`. `packages/database` uses Prisma, which is a Node.js library. Tauri 2 apps ship a Rust binary and a webview frontend; there is no bundled Node.js runtime in a production Tauri build, so the Prisma Client (as used by `apps/api`) cannot run inside the desktop app's Rust process without additional infrastructure.

Three implementation options were considered for how the desktop app reads/writes local data:

1. **Rust-native SQLite** — the Tauri Rust shell (`src-tauri`) owns a local SQLite database directly via a crate such as `rusqlite` or `sqlx`, exposed to the React frontend as Tauri commands. Requires maintaining a schema mirror (or a Rust-side migration story) separate from `packages/database`'s Prisma schema.
2. **Bundled Node sidecar** — package a Node.js process (running the existing Prisma Client) as a Tauri "sidecar" binary, communicating with the Rust shell/React frontend over local IPC or HTTP. Reuses `packages/database` as-is but adds packaging complexity (bundling a Node runtime per platform) and a second long-running process per desktop instance.
3. **Online-only for now** — the desktop app calls `apps/api` over HTTP exactly like `apps/web` does, with no local database at all. Embedded SQLite and background sync are deferred to a dedicated later milestone.

## Decision

Adopt **Option 3 (online-only)** for the first working desktop app (Phase 2, milestone M7). The desktop app will use `packages/api-sdk` to call `apps/api` over HTTP, with no local SQLite involved yet.

The choice between **Option 1 (Rust-native SQLite)** and **Option 2 (Node sidecar)** for true offline support is deferred to milestone M11 ("Embedded SQLite and Background Sync"), to be decided in a follow-up ADR once a working online desktop app exists to build offline support on top of. At that time, `rusqlite`/`sqlx` (Option 1) is the current lead candidate, since it avoids bundling a full Node runtime per platform and keeps the Rust shell self-contained, but this will be confirmed with a short spike before committing.

## Consequences

- Milestone M7 (first running desktop app) is reachable without solving the offline/local-database problem, keeping the initial vertical slice small.
- `packages/database`'s Prisma schema is, for now, only consumed by `apps/api` against PostgreSQL (and SQLite for local API development). It is not yet consumed directly by `apps/desktop`.
- The desktop app will require network connectivity to be useful until M11 ships. This is acceptable for Phase 2's early milestones and matches how `apps/web` already works.
- When M11 is implemented, if Option 1 is confirmed, `packages/database` will need a maintained SQLite schema mirror (or schema-generation step) usable from Rust; if Option 2 is chosen instead, a sidecar packaging and IPC strategy will need to be designed and documented in a follow-up ADR.
