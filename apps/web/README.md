# @st-manager/web

Next.js Studio Web Portal — the V1 browser-based application for studio administrators and staff. Always online; communicates with `@st-manager/api` via `@st-manager/api-sdk`. No embedded database.

## Structure

- `src/app/` — App Router routes, layouts, and pages
- `src/components/shell/` — persistent app shell (header, sidebar)
- `src/components/studios/` — Studios feature client components
- `src/lib/` — API client wiring (`packages/api-sdk`)
- `src/styles/` — global Tailwind CSS entry
- `public/` — static assets

## Development

Requires `apps/api` running against the dev SQLite database:

```bash
# Terminal 1 — API
pnpm --filter @st-manager/api dev

# Terminal 2 — Web portal
pnpm --filter @st-manager/web dev
```

Open `http://localhost:3000/studios`. In development, API calls are proxied via Next.js rewrites at `/api/*` (see `next.config.ts`). Copy `.env.example` to `.env.local` if you need to override `NEXT_PUBLIC_API_BASE_URL` for production-like builds.

## Status

Implemented in M8 — Studio list/create in the browser backed by the real API.
