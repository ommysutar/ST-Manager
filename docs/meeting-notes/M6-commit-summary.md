# M6 Commit Summary — UI Foundation

- Date: 2026-07-03
- Milestone: M6 (UI Foundation)
- Status: **Reviewed, approved, and committed.**
- Full details: [M6-planning-report.md](./M6-planning-report.md), [M6-implementation-report.md](./M6-implementation-report.md)

## Commit Hash

```
957abcd553dba898ec97b401f9f7cdedd56f1887
```

- Branch: `main`
- Message: `feat(ui): implement theme tokens, Tailwind v4 preset, and shared UI primitives (M6)`
- Author: `omkarsutar <omkarsutar841@gmail.com>`
- Date: Fri Jul 3 01:14:11 2026 +0530

## Files Changed

**38 files changed, 1527 insertions(+), 26 deletions(-)**

| Area | Change |
|---|---|
| `packages/theme` | Implemented: `src/tokens/{color,radius,typography,spacing}.ts`, `src/themes/{light,dark}.ts`, `scripts/generate-css.ts`, generated + committed `src/css/tokens.css`, `src/index.ts`. `package.json`/`README.md` updated; 3 `.gitkeep` placeholders removed. |
| `packages/config-tailwind` | Implemented: `src/preset.css` (Tailwind v4, `@theme inline`, class-based dark variant). `package.json`/`README.md` updated. |
| `packages/ui` | Implemented: `Button`, `Input`, `Card` (shadcn-sourced, hand-authored), `StudioList`/`StudioForm` (composed, presentational), `src/lib/cn.ts`, `src/index.ts`, `components.json`. `package.json`/`tsconfig.json`/`README.md` updated; 2 `.gitkeep` placeholders removed. |
| `eslint.config.mjs` | Modified — wired `@st-manager/config-eslint/react` preset, scoped to `packages/ui/**`. |
| `docs/meeting-notes/` | `M6-planning-report.md`, `M6-implementation-report.md` created; `assets/m6-smoke-{light,dark}.png` (smoke-test screenshots) added. |
| `pnpm-lock.yaml` | Modified — reflects new dependencies. |

## Dependencies Added

| Package | Dependency | Resolved version |
|---|---|---|
| `packages/theme` | `tsx` (dev) | 4.22.5 |
| `packages/config-tailwind` | `tailwindcss` | 4.3.2 |
| `packages/ui` | `@radix-ui/react-slot` | 1.3.0 |
| `packages/ui` | `class-variance-authority` | 0.7.1 |
| `packages/ui` | `clsx` | 2.1.1 |
| `packages/ui` | `tailwind-merge` | 3.6.0 |
| `packages/ui` | `lucide-react` | 0.545.0 |
| `packages/ui` | `react` / `react-dom` (peer + dev) | 19.2.7 |

No dependency added to root, `apps/web`, or `apps/desktop`.

## Validation Summary

| Check | Result |
|---|---|
| `pnpm install` | Pass |
| `pnpm build` (root, all 9 buildable packages/apps) | Pass — full Turbo cache hit |
| `pnpm --filter @st-manager/theme typecheck` | Pass |
| `pnpm --filter @st-manager/ui typecheck` | Pass |
| `pnpm lint` (root) | Pass — 0 errors, 0 warnings (2 warnings surfaced and fixed during implementation: `no-console` in the CSS generator, `react-refresh/only-export-components` on `buttonVariants`) |
| `packages/config-tailwind` preset compile (`@tailwindcss/cli@4`, ad hoc — package has no build script by design) | Pass — 0 errors; confirmed `bg-primary` compiles to `var(--primary)`, not an inlined value, which is what makes runtime `.dark` theming work |
| Smoke-render test (throwaway Vite app, deleted after use) | Pass — `Button`/`Input`/`Card`/`StudioList`/`StudioForm` render correctly in both light and dark mode; screenshots in `docs/meeting-notes/assets/` |

## Known Limitations

1. **Not yet verified inside an actual Tauri webview** — the smoke test ran in a Chromium/WebKit browser tab via CDP, not a native Tauri window. Tailwind v4's use of `color-mix()`/cascade layers should be reconfirmed once M7 has a real desktop shell.
2. **Cross-package Tailwind content detection (`@source`) is untested end-to-end** — the smoke test imported theme CSS directly in a single throwaway app; the real multi-package scenario (an app's CSS entry pointing `@source` at `packages/ui/src`) is deferred to M7/M8, where it becomes a required step, not an assumption.
3. **shadcn CLI was not used** — `Button`/`Input`/`Card` were hand-authored to shadcn's exact current conventions instead, since the CLI targets a full app, not a standalone library package. `components.json` is in place for any future CLI-driven additions inside a real app.
4. **No dark-mode toggle UI exists yet** — `.dark` class-based theming is implemented and proven (smoke test), but no user-facing control to switch it is built (out of scope for M6; a future product decision).
5. **`apps/web` and `apps/desktop` remain untouched** — by design; this milestone only prepared the shared foundation.

## Next Milestone

**M7 — Desktop Shell Bootstrap.** Per the roadmap, this scaffolds the real Tauri 2 + Vite + React app in `apps/desktop`, wires in `packages/ui`/`packages/theme`/`packages/config-tailwind`/`packages/api-sdk` for real, and produces the first actually-running desktop window (Studio list + create, backed by the live API) — closing Known Limitations 1 and 2 above.

M7 has not been started. Work stops here pending further instruction.
