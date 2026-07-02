# @st-manager/config-tailwind

Shared Tailwind CSS v4 preset, referencing design tokens from `@st-manager/theme`. CSS-only — there is no `tailwind.config.js`/`.ts` (Tailwind v4 is CSS-first) and nothing here is compiled or typechecked by this package itself; it is consumed by reference from each app's own CSS entry point.

- `src/preset.css` — the single shared entry: imports Tailwind itself, imports `@st-manager/theme`'s generated CSS variables, and maps them into Tailwind's `--color-*`, `--radius-*`, and `--font-*` `@theme` namespaces (so utilities like `bg-primary`, `rounded-lg`, `font-sans` resolve to the shared tokens). Also declares the `dark` variant as class-based (`.dark`), not `prefers-color-scheme`.

Usage (wired into a real app starting M7/M8, not yet in M6):

```css
/* apps/web/src/styles/globals.css or apps/desktop/src/styles/globals.css */
@import "@st-manager/config-tailwind/preset.css";
@source "../../../../packages/ui/src/**/*.{ts,tsx}";
```

The `@source` line is required — Tailwind v4's automatic content detection does not reliably cross package boundaries in a monorepo, so each app must explicitly point it at `packages/ui/src` (and any other package contributing class names) or those utility classes get purged.

`apps/web` (Next.js) integrates this via the `@tailwindcss/postcss` PostCSS plugin; `apps/desktop` (Vite) integrates it via the `@tailwindcss/vite` plugin. Both consume this same `preset.css`.

Status: implemented (M6). Not yet wired into any app — that happens in M7 (desktop) / M8 (web).
