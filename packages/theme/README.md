# @st-manager/theme

Semantic design tokens, theme variants, and generated CSS variables, kept separate from Tailwind build config and React components. Framework-agnostic: no React, Tailwind, or shadcn dependency — just TypeScript and a small build-time CSS generator.

- `src/tokens/` — raw palette (`color.ts`), a single base corner radius (`radius.ts`), typeface choice (`typography.ts`), and named layout constants (`spacing.ts`; deliberately not a spacing utility scale — Tailwind's default one already covers that). Font-size/weight scales and shadow tokens are intentionally **not** defined here yet (M6 scope): Tailwind's defaults cover them without duplication until a component actually needs a custom value.
- `src/themes/` — `light.ts`/`dark.ts` map raw tokens into semantic roles (`background`, `primary`, `mutedForeground`, ...), named to match shadcn/ui's own CSS variable convention so `packages/ui` needs no renaming layer.
- `src/css/tokens.css` — **generated** (`pnpm --filter @st-manager/theme build` runs `scripts/generate-css.ts`) `:root`/`.dark` CSS custom properties from the files above. Committed to the repo so consumers don't need a build step just to `@import` it; regenerate and diff instead of hand-editing.

Consumed by `packages/config-tailwind`'s preset (`@import "@st-manager/theme/css/tokens.css"`) and, for programmatic access (e.g. a future chart palette), via the package's default export (`import { colorTokens, lightTheme } from "@st-manager/theme"`).

Status: implemented (M6).
