# M7 Commit Summary — Desktop Shell Bootstrap

- Date: 2026-07-03
- Milestone: M7 (Desktop Shell Bootstrap)
- Status: **Reviewed, approved, and committed.**
- Full details: [M7-planning-report.md](./M7-planning-report.md), [M7-implementation-report.md](./M7-implementation-report.md)

## Commit Hash

```
c22bc8585523ec8773831b514a54cc8379c8d547
```

- Branch: `main`
- Message: `feat(desktop): bootstrap Tauri 2 shell with Studio list/create (M7)`
- Author: `omkarsutar <omkarsutar841@gmail.com>`
- Date: Fri Jul 3 01:49:39 2026 +0530

## Files Changed

**51 files changed, 2168 insertions(+), 17 deletions(-)**

| Area | Change |
|---|---|
| `apps/desktop` (frontend) | Tauri 2 + Vite + React app: `index.html`, `vite.config.ts`, `src/main.tsx`, `App.tsx`, hash router, app shell (header/sidebar), `StudiosPage`, `api-client.ts`, `globals.css` with `@source` for `packages/ui`. |
| `apps/desktop/src-tauri` | Generated via `tauri init --ci`: `Cargo.toml`, `main.rs`, `lib.rs`, `tauri.conf.json` (`com.stmanager.desktop`, 1280×800), capabilities, placeholder icons. |
| `eslint.config.mjs` | Extended React ESLint preset to `apps/desktop/**/*.{ts,tsx}`. |
| `docs/meeting-notes/` | `M7-planning-report.md`, `M7-implementation-report.md`, `assets/m7-desktop-studios.png` (e2e screenshot). |
| `pnpm-lock.yaml` | Modified — 32 new desktop dependencies. |

## Dependencies Added

| Package | Dependency | Resolved version |
|---|---|---|
| `apps/desktop` | `react`, `react-dom` | 19.2.0 |
| `apps/desktop` | `react-router` | 7.6.3 |
| `apps/desktop` | `@tauri-apps/api` | 2.11.1 |
| `apps/desktop` | `@tauri-apps/cli` (dev) | 2.11.4 |
| `apps/desktop` | `vite` (dev) | 6.4.3 |
| `apps/desktop` | `@vitejs/plugin-react` (dev) | 4.5.2 |
| `apps/desktop` | `@tailwindcss/vite` (dev) | 4.1.16 |
| `apps/desktop` | `lucide-react` | 0.545.0 |
| `apps/desktop` | `@st-manager/{ui,theme,api-sdk,contracts,types,constants,validation}` | workspace |
| `apps/desktop` | `@st-manager/config-tailwind` (dev) | workspace |

## Validation Summary

| Check | Result |
|---|---|
| `pnpm install` | Pass |
| `pnpm --filter @st-manager/desktop typecheck` | Pass |
| `pnpm lint` (root) | Pass — 0 errors, 0 warnings |
| `pnpm build` (root, 10 tasks) | Pass — full Turbo cache hit after commit validation |
| End-to-end (API dev + desktop dev) | Pass — list loads real studios; create **“M7 Desktop E2E Studio”** verified in UI + `curl` |
| Screenshot | `docs/meeting-notes/assets/m7-desktop-studios.png` |

## Known Limitations

1. **Production Tauri CORS** — Vite dev proxy avoids CORS in development only; production builds calling `http://localhost:4000` directly still need API CORS or `@tauri-apps/plugin-http` (future milestone).
2. **Online-only desktop** — by design (ADR 0001); requires `apps/api` running until M11 embedded SQLite + sync.
3. **Root `pnpm typecheck` fails** — pre-existing empty-package `TS18003` errors unrelated to M7; `@st-manager/desktop` typechecks cleanly in isolation.
4. **Tauri placeholder branding** — generated icons and generic `Cargo.toml` metadata; real app icon deferred.
5. **Native Tauri window screenshot** — e2e validated via Vite dev server (same URL `tauri dev` loads); separate native-window capture not taken.

## Next Milestone

**M8 — Web Portal Bootstrap.** Scaffold Next.js App Router in `apps/web` with the same Studio list/create feature via `packages/ui` and `packages/api-sdk`.

M8 has not been started. Work stops here pending further instruction.
