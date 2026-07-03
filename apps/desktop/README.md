# @st-manager/desktop

Tauri 2 native desktop client (React + Vite frontend, Rust shell). Uses **embedded SQLite** (M11) for local-first Studio data and syncs to `@st-manager/api` via `@st-manager/api-sdk` when online and authenticated.

## Structure

- `src/` — React frontend rendered in the Tauri webview
  - `app/shell/` — persistent app shell (header, sidebar, layout)
  - `app/studios/` — Studios feature screen (local list + create)
  - `app/router.tsx` — hash-based client routing (`react-router`)
  - `lib/api-client.ts` — `packages/api-sdk` wiring (auth + sync)
  - `lib/sync-engine.ts` — background push/pull sync when online
  - `lib/tauri/studios.ts` — typed Tauri invoke wrappers for local SQLite
  - `styles/globals.css` — Tailwind v4 entry (`@st-manager/config-tailwind/preset.css`)
- `src-tauri/` — Rust application shell (Tauri 2 + `rusqlite` local database)

## Local database

- File: `{app_data_dir}/st-manager.db` (platform-specific app data directory)
- Schema mirrors `packages/database/prisma/sqlite/schema.prisma` (`Studio` fields + local `sync_status` metadata)
- Migrations: `src-tauri/src/db/migrations.rs` (`PRAGMA user_version`)

## Development

Requires `apps/api` running for auth and sync (local list/create works offline once signed in at least once for sync push):

```bash
# Terminal 1 — API
pnpm --filter @st-manager/api dev

# Terminal 2 — Desktop (Tauri + Vite)
pnpm --filter @st-manager/desktop tauri dev
```

Copy `.env.example` to `.env` if you need to override `VITE_API_BASE_URL` (dev defaults to Vite origin with proxy to `:4000`).

Dev credentials: `dev@st-manager.local` / `devpassword`

## Status

M7: first running desktop app. M10: header auth. M11: embedded SQLite + background sync.
