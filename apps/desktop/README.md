# @st-manager/desktop

Tauri 2 native desktop client (React + Vite frontend, Rust shell). Calls `@st-manager/api` over HTTP via `@st-manager/api-sdk` (online-only until M11 embedded SQLite + sync).

## Structure

- `src/` — React frontend rendered in the Tauri webview
  - `app/shell/` — persistent app shell (header, sidebar, layout)
  - `app/studios/` — Studios feature screen (list + create)
  - `app/router.tsx` — hash-based client routing (`react-router`)
  - `lib/api-client.ts` — `packages/api-sdk` wiring (`VITE_API_BASE_URL`)
  - `styles/globals.css` — Tailwind v4 entry (`@st-manager/config-tailwind/preset.css`)
- `src-tauri/` — Rust application shell (Tauri 2)

## Development

Requires `apps/api` running against the dev SQLite database:

```bash
# Terminal 1 — API
pnpm --filter @st-manager/api dev

# Terminal 2 — Desktop
pnpm --filter @st-manager/desktop tauri dev
```

Copy `.env.example` to `.env` if you need to override `VITE_API_BASE_URL` (defaults to `http://localhost:4000`).

## Status

Implemented in M7 — first running desktop app with Studio list/create backed by the real API.
