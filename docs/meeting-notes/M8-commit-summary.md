# M8 Commit Summary — Web Portal Bootstrap

- Date: 2026-07-03
- Milestone: M8 (Web Portal Bootstrap)
- Status: **Implemented, validated, not committed** — awaiting review and explicit approval before commit.
- Full details: [M8-planning-report.md](./M8-planning-report.md), [M8-implementation-report.md](./M8-implementation-report.md)

## Commit Hash

```
(pending — not committed)
```

- Branch: `main`
- Proposed message: `feat(web): bootstrap Next.js portal with Studio list/create (M8)`

## Files Changed

**~25 files** across `apps/web`, `eslint.config.mjs`, `pnpm-lock.yaml`, and milestone docs (exact count from working tree at validation time).

| Area | Change |
|---|---|
| `apps/web` | Next.js 15 App Router bootstrap: `next.config.ts` (transpilePackages, `/api/*` dev rewrites, workspace source aliases), `postcss.config.mjs`, App Router pages (`/`, `/studios`), app shell (header/sidebar), `StudiosPageClient`, `api-client.ts`, `globals.css` with `@source` for `packages/ui`. |
| `eslint.config.mjs` | Extended React ESLint preset to `apps/web/**/*.{ts,tsx}`; ignores `apps/web/next-env.d.ts`. |
| `docs/meeting-notes/` | `M8-planning-report.md`, `M8-implementation-report.md`, `assets/m8-web-studios.png` (e2e screenshot). |
| `pnpm-lock.yaml` | Modified — new web dependencies (Next.js, PostCSS, React 19, etc.). |

**Out of scope for M8 commit:** untracked `M6-commit-summary.md` and `M7-commit-summary.md` from prior milestones.

## Dependencies Added

| Package | Dependency | Resolved version |
|---|---|---|
| `apps/web` | `next` | 15.5.20 |
| `apps/web` | `react`, `react-dom` | 19.2.7 |
| `apps/web` | `lucide-react` | 0.545.0 |
| `apps/web` | `@tailwindcss/postcss` (dev) | 4.1.16 |
| `apps/web` | `postcss` (dev) | 8.5.6 |
| `apps/web` | `@types/node` (dev) | 22.15.3 |
| `apps/web` | `@st-manager/{ui,theme,api-sdk,contracts,types,constants,validation}` | workspace |
| `apps/web` | `@st-manager/config-tailwind` (dev) | workspace |

## Validation Summary

| Check | Result |
|---|---|
| `pnpm install` | Pass |
| `pnpm --filter @st-manager/web typecheck` | Pass |
| `pnpm lint` (root) | Pass — 0 errors, 0 warnings |
| `pnpm build` (root, 11 tasks) | Pass — includes `@st-manager/web` |
| End-to-end (API dev + web dev) | Pass — list loads real studios; create **“M8 Web Validation Studio”** verified via Next `/api/studios` proxy + `curl http://localhost:4000/studios` |
| Screenshot | `docs/meeting-notes/assets/m8-web-studios.png` |

## Known Limitations

1. **Production browser CORS** — Next.js dev rewrites avoid CORS in development only; production builds with `NEXT_PUBLIC_API_BASE_URL` pointing at a separate origin still need API CORS or a reverse proxy (future milestone / deployment concern).
2. **Dev rewrite prefix `/api/*`** — differs from the planning report’s `/studios` proxy to avoid App Router route collision; `api-client.ts` uses `${window.location.origin}/api` in dev.
3. **Online-only web portal** — by design (ADR 0001); requires `apps/api` running.
4. **Root `pnpm typecheck` fails** — pre-existing empty-package `TS18003` errors unrelated to M8; `@st-manager/web` typechecks cleanly in isolation.
5. **Concurrent dev + build** — running `next build` while `next dev` is active can corrupt `apps/web/.next`; delete `.next` and restart dev if 500 errors appear.

## Next Milestone

**M9 — per roadmap.**

M9 has not been started. Work stops here pending review, approval, and explicit commit instruction.
