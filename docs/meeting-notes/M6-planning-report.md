# M6 Planning Report — UI Foundation

- Date: 2026-07-02
- Milestone: M6 (UI Foundation)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md), M0–M5 implementation reports, frozen architecture (root `README.md`), ADR 0001 (desktop local data access)
- Status: **Planning only — no application code, dependencies, or commits have been generated.** Awaiting approval before implementation.

## 1. Current Repository State

Repository history after M5 (`5e9e616`):

```
c48f8ba feat(database): implement Prisma 7 database layer            (M2)
5a337c2 feat(api): bootstrap NestJS API with health endpoint          (M3)
e4ec488 feat(contracts,sdk): add Studio API contracts and SDK thread  (M4)
5e9e616 feat(api): implement Studio CRUD feature module               (M5)
```

What exists and is real (not scaffolding) going into M6:

- `packages/types`: `Studio { id, name, createdAt, updatedAt }` — the shape every UI component in this milestone will render.
- `packages/api-sdk`: `createHttpClient()`, `createStudiosApi()` with real `listStudios()`/`createStudio()` methods, unwrapping the `{ success, data, meta }` envelope. Not consumed by any UI yet — that wiring is explicitly M7 (desktop) / M8 (web), not M6.
- `packages/contracts`, `packages/constants`, `packages/validation`, `packages/database`, `apps/api`: fully implemented Studio CRUD vertical slice (API side). Irrelevant to M6 except as the eventual data source for M7/M8.
- `packages/config-eslint/react.mjs`: **already exists** (from M0) — a flat-config React preset (`react-hooks`, `react-refresh`, browser globals) layered on the shared base. **Not yet wired into root `eslint.config.mjs`**, which currently only applies `base` everywhere plus a NestJS-specific override for `apps/api`.
- `packages/config-typescript/react.json`: **already exists** (from M0) — `lib: ["ES2022", "DOM", "DOM.Iterable"]`, `jsx: "react-jsx"`. `apps/web/tsconfig.json`, `apps/desktop/tsconfig.json`, and `packages/ui/tsconfig.json` **already extend it**.
- Root `turbo.json` already anticipates a Next.js build (`outputs: ["dist/**", ".next/**", "target/**"]`).
- `.nvmrc` pins Node 20.

What is pure scaffolding (folders + `.gitkeep` only, empty `package.json` with just `typescript` devDependency and a `typecheck` script, placeholder `README.md`) and is this milestone's actual scope:

- `packages/theme` — `src/tokens/`, `src/themes/`, `src/css/` all empty.
- `packages/config-tailwind` — no source files at all yet, not even a `src/` folder.
- `packages/ui` — `src/components/`, `src/hooks/`, `src/lib/` all empty.

`apps/web` and `apps/desktop` are also still pure scaffolding (`src/app`, `src/components`, `src/hooks`, `src/lib`, `src/styles`, all `.gitkeep`-only; no Next.js/Vite/Tauri config files exist). **Per the roadmap, bootstrapping those apps is M7 (desktop) and M8 (web), not M6.** M6 prepares the three shared packages so M7/M8 can wire them in without inventing UI architecture under app-delivery pressure.

No React, Tailwind, or shadcn dependency is installed anywhere in the repo today (`pnpm list -r react` / `tailwindcss` would return nothing). This is a genuinely greenfield UI milestone.

## 2. Existing UI Packages (Detailed Inventory)

| Package | package.json state | src/ state | Depends on (frozen arch) |
|---|---|---|---|
| `packages/theme` | name/description only, `typescript` devDep, `typecheck` script | 3 empty dirs | none |
| `packages/config-tailwind` | name/description only, **no scripts, no devDeps at all** | none | `packages/theme` (per its own README) |
| `packages/ui` | name/description only, `typescript` devDep, `typecheck` script | 3 empty dirs | `packages/theme`, `packages/config-tailwind`, `packages/types` |

Each package's README already states its intended shape (written at scaffold time, M0-era):

- `packages/theme`: "raw and semantic tokens (color, spacing, typography, radii, shadows)" in `tokens/`, "theme maps composing tokens into light/dark/brand variants" in `themes/`, "generated CSS custom property files" in `css/`.
- `packages/config-tailwind`: "Shared Tailwind CSS build configuration and content paths, referencing design tokens from `@st-manager/theme`."
- `packages/ui`: "shadcn/ui primitives and composed React components consumed by both `@st-manager/web` and `@st-manager/desktop`" in `components/`, hooks in `hooks/`, "`cn()` utility and variant helpers" in `lib/`.

These READMEs match the roadmap's M6 definition almost exactly and are treated as the source of truth for scope below, updated only where a concrete technical decision is needed (e.g. Tailwind v4's CSS-first model changes what "Tailwind build configuration" means in practice — see §4).

## 3. Theme Architecture

**Goal:** one small set of semantic design tokens, framework-agnostic, that both Tailwind (via `packages/config-tailwind`) and shadcn components (via CSS variables) consume — no component ever hard-codes a color/spacing value.

Proposed structure:

- `packages/theme/src/tokens/color.ts`, `spacing.ts`, `radius.ts`, `typography.ts` — raw token values as plain TS objects (source of truth, typed, so any package can also consume them programmatically, e.g. for chart colors in a future AI dashboard).
- `packages/theme/src/themes/light.ts` (and a `dark.ts` stub, defined but not wired into a toggle yet — dark mode *switching* is out of scope for M6, only the token values are prepared) — maps raw tokens to **semantic** roles: `background`, `foreground`, `primary`, `primaryForeground`, `muted`, `border`, `destructive`, etc. These semantic names are deliberately chosen to match shadcn/ui's own default CSS variable naming convention (`--background`, `--primary`, ...) so `packages/ui`'s shadcn components work with zero renaming/mapping layer.
- `packages/theme/src/css/tokens.css` — **generated** (by a small build script, not hand-maintained) from `themes/light.ts`, emitting `:root { --background: ...; --primary: ...; }` as real CSS custom properties. This is the one artifact `packages/config-tailwind` and every app's global stylesheet actually `@import`.
- `packages/theme/package.json` gains a `build` script that runs this generator (plain Node/`tsx` script, no new heavy dependency) and a `typecheck` script (already present).

This keeps `packages/theme` framework-agnostic: it has no React, Tailwind, or shadcn dependency at all — just TypeScript and a tiny CSS-generation script. Tailwind and React are consumers, never the other way around.

## 4. Tailwind Architecture

**Decision point:** Tailwind CSS **v4**, not v3. This repo consistently tracks current major versions elsewhere (TypeScript 6, NestJS 11, Prisma 7, Zod 4, ESLint 10), and Tailwind v4 is the current release line. This is a real architectural shift from v3, flagged explicitly for approval:

- No `tailwind.config.js`/`.ts` file. Configuration is CSS-first via an `@theme { ... }` block and plugins are loaded with `@plugin`.
- Content is auto-detected by scanning from the CSS file's location, but **in a monorepo this does not reliably cross package boundaries** — `packages/ui`'s `.tsx` files live outside `apps/web`'s and `apps/desktop`'s own directory trees, so each app's CSS entry point must add an explicit `@source "../../../packages/ui/src/**/*.{ts,tsx}";` directive. This is called out again in §12 (Risks) because it's a common real-world gotcha with this exact monorepo shape.
- Two different integration mechanisms are needed for the two apps (both still just "wiring," done in M7/M8, but `packages/config-tailwind` must support both):
  - `apps/web` (Next.js): PostCSS plugin `@tailwindcss/postcss`.
  - `apps/desktop` (Vite): dedicated `@tailwindcss/vite` plugin (recommended by Tailwind for Vite projects — faster, no PostCSS config needed).

Proposed structure for `packages/config-tailwind`:

- `packages/config-tailwind/src/preset.css` — the single shared entry: `@import "tailwindcss"; @import "@st-manager/theme/css/tokens.css"; @theme { --color-background: var(--background); ... }` mapping the theme package's raw CSS variables into Tailwind v4's `@theme` namespace (so utilities like `bg-background`, `text-primary` are generated).
- `packages/config-tailwind/package.json` gains `dependencies` on `@st-manager/theme` (workspace) and `tailwindcss`, and a `typecheck`-equivalent is not meaningful here (it's CSS, not TS) — instead a `build`/`lint`-free package, documented in its README as "CSS-only, consumed via `@import`, not compiled."
- No JS/TS exports needed from this package for v4 — this is a meaningful simplification versus the v3-era plan of exporting a JS preset object, and is called out as a deviation from the original README wording ("Tailwind CSS build configuration") which predates the v4 decision.

## 5. shadcn/ui Architecture

shadcn/ui is a **generator**, not an installable npm package — `npx shadcn@latest add button` copies component source directly into the target directory. For a component library shared by two apps, the standard (and recommended) pattern is to run the generator **once, inside `packages/ui`**, and have both apps consume the compiled/source result via the workspace dependency — never run shadcn separately inside `apps/web` or `apps/desktop`.

Proposed setup:

- `packages/ui/components.json` — the shadcn CLI config, pointing its `tailwind.css` field at `packages/config-tailwind/src/preset.css`, aliases (`@/components`, `@/lib`) mapped to `src/components`, `src/lib`.
- Components installed in this milestone (per roadmap scope, deliberately minimal): **`Button`, `Input`, `Card`**. Each lands in `packages/ui/src/components/ui/{button,input,card}.tsx`, using `class-variance-authority` (`cva`) for variants and the shared `cn()` helper.
- `packages/ui/src/lib/cn.ts` — the standard shadcn utility: `clsx` + `tailwind-merge` composed into `cn(...)`.
- `lucide-react` as the icon library (shadcn's default) — not strictly required for `Button`/`Input`/`Card` alone, but added now since every shadcn component generated from this point forward assumes it's available, avoiding a partial-install footgun later.

**Non-interactive CLI risk:** the `shadcn` CLI's `init` step is interactive by default (prompts for style, base color, CSS variables). It does support non-interactive flags (`--yes`, `-c` for config path) for scripted use, which is what will be used here so the setup is reproducible and reviewable as a diff rather than a black-box interactive session. This is called out in §12.

## 6. Shared Component Strategy

Two decisions that keep `packages/ui` genuinely shared rather than secretly desktop- or web-flavored:

1. **Presentational-only components.** `StudioList` and `StudioForm` (the two composed components the roadmap calls for) accept data and callbacks as props — e.g. `StudioList({ studios: Studio[] })`, `StudioForm({ onSubmit: (input: { name: string }) => void, isSubmitting?: boolean })`. They import the `Studio` type from `packages/types` but **never import `packages/api-sdk` or call `fetch` themselves.** Wiring `api-sdk` calls to these components is explicitly M7/M8 work (each app owns its own data-fetching/state strategy — e.g. React Query in one, plain `useEffect` in the other — without `packages/ui` dictating that choice).
2. **Build-less, source-exported package.** Rather than giving `packages/ui` a `tsc`-to-`dist` build step (like `packages/types`/`packages/contracts`), it exports TSX **source** directly (`"exports": { ".": "./src/index.ts" }`, no `main`/`build` script), relying on the consuming app's own bundler (Next.js's compiler, Vite) to transpile it. This is the standard pattern for monorepo shadcn/Turborepo templates and avoids a stale-`dist` class of bugs (component packages are only ever consumed by other bundlers, unlike `packages/database`/`packages/validation`, which are consumed by plain Node.js and therefore *must* pre-compile to CommonJS). This is a deliberate, explicit deviation from the "every package builds to `dist`" pattern established in M1–M5, flagged here for approval rather than applied silently.

`react` and `react-dom` are declared as `peerDependencies` (not regular `dependencies`) of `packages/ui`, with matching `devDependencies` for local typechecking. This prevents two copies of React ending up in `apps/web`'s and `apps/desktop`'s bundles — each app supplies its own React, and `packages/ui` just has to be compatible with whatever version they declare.

## 7. Desktop UI Architecture

Out of scope for actual implementation in M6 (that's M7 — "Desktop Shell Bootstrap"), but M6's package design must not paint M7 into a corner:

- `apps/desktop` will be a Vite + React app (per the frozen architecture and ADR 0001), so its Tailwind integration is the `@tailwindcss/vite` plugin path from §4, and it consumes `packages/ui` exactly like any other Vite-bundled workspace dependency (no special-casing needed since `packages/ui` ships source, not a pre-bundled artifact).
- Tauri ships the OS's native webview (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux) rather than an evergreen Chromium — **this is the one real compatibility question for the Tailwind v4 decision** (v4 generates CSS using modern features like `color-mix()` and cascade layers). Flagged as a risk in §12 rather than silently assumed safe.
- The existing `apps/desktop/src/{components,hooks,lib,styles}` scaffold folders already match where `packages/ui`-consuming code and a local Tailwind entry CSS (`src/styles/globals.css`) will eventually live — no folder restructuring needed in M6 or M7.

## 8. Web UI Compatibility

Also out of scope for implementation in M6 (M8), with the same "don't paint into a corner" lens:

- `apps/web` will be Next.js App Router. Interactive shadcn components (anything with local state or event handlers — `Button` as a clickable element, all of `StudioForm`) need a `"use client"` directive to work under Next's Server Components default. The plan is to put `"use client"` **inside the component files in `packages/ui` itself** (harmless no-op comment under Vite/desktop, required under Next/web) rather than pushing that concern onto every consumer — one source of truth, works unmodified in both apps.
- Next.js's Tailwind integration is the PostCSS plugin path from §4, different from desktop's Vite plugin — both are supported by the same `packages/config-tailwind/src/preset.css` entry, so this difference is confined to each app's own build config (added in M8), not to the shared packages built in M6.
- No Next.js-specific API (e.g. `next/image`, `next/link`) may be used inside `packages/ui` — that would break desktop. Plain `<img>`/`<a>` (or framework-agnostic wrappers passed in as props, if ever needed later) only.

## 9. Dependencies Required and Justification

All additions are scoped to `packages/theme`, `packages/config-tailwind`, and `packages/ui` only. Nothing is added to `apps/web`, `apps/desktop`, or the root in this milestone (they gain their React/Next/Vite/Tauri toolchains in M7/M8).

| Package | Dependency | Type | Why |
|---|---|---|---|
| `packages/ui` | `react`, `react-dom` | `peerDependencies` + matching `devDependencies` | Components need React types/JSX at dev-time; peer (not direct) so apps control the actual installed version and avoid duplicate React copies. |
| `packages/ui` | `class-variance-authority` | `dependencies` | shadcn's standard variant-styling primitive, used by every generated component (`Button`, `Input`, `Card`). |
| `packages/ui` | `clsx`, `tailwind-merge` | `dependencies` | Compose the standard shadcn `cn()` class-merging helper in `src/lib/cn.ts`. |
| `packages/ui` | `lucide-react` | `dependencies` | shadcn's default icon set; adding it now avoids a partial/inconsistent install the first time a future component needs an icon. |
| `packages/ui`, `apps/web` (types only, added in M8), `apps/desktop` (types only, added in M7) | `@types/react`, `@types/react-dom` | `devDependencies` | Typecheck `packages/ui`'s TSX in isolation without needing a full app bundler present. |
| `packages/config-tailwind` | `tailwindcss` | `dependencies` | The shared `preset.css` entry (`@import "tailwindcss"`) needs the package resolvable from this workspace package. |
| `packages/config-tailwind` | `@st-manager/theme` | `dependencies` (workspace) | `preset.css` imports `@st-manager/theme/css/tokens.css` directly. |
| `packages/ui` (dev-only, invoked via `pnpm dlx`/`npx`, not persisted as a dependency) | `shadcn` CLI | ad hoc, not in `package.json` | Used once per component addition to generate source files; the CLI itself is not a runtime or build-time dependency of the package it writes into. |
| `packages/theme` | none (or `tsx`, dev-only, to run the token→CSS generator script) | `devDependencies` | Keep `packages/theme` dependency-free at runtime; the generator script is a build-time tool only. |

No dependency is added to the **root** `package.json` — Tailwind/React tooling stays scoped to the packages that need it, consistent with how `zod`/NestJS packages were scoped to `packages/validation`/`apps/api` rather than hoisted to root in M3–M5.

## 10. Files to Create

**`packages/theme/`**
- `src/tokens/color.ts`, `src/tokens/spacing.ts`, `src/tokens/radius.ts`, `src/tokens/typography.ts`
- `src/themes/light.ts`, `src/themes/dark.ts` (values defined, not yet wired to a runtime toggle)
- `src/css/tokens.css` (generated output, committed like `packages/database`'s generated Prisma clients are *not* committed — **decision needed**: commit the generated CSS so consumers don't need to run a build step, matching how `packages/types`/`packages/contracts` commit hand-written source rather than generated output. Recommendation: commit it, since it's small, human-readable, and diffable — flagged for approval, not assumed.)
- `src/index.ts` (re-exports tokens/themes for programmatic consumption)
- `scripts/generate-css.ts` (or `src/build-css.ts`) — the tokens → CSS generator
- Update `package.json` (`build`/`typecheck` scripts, `main`/`types`/`exports`)
- Update `README.md` (status: implemented)

**`packages/config-tailwind/`**
- `src/preset.css`
- `package.json` (add `tailwindcss` + `@st-manager/theme` dependencies, describe CSS-only consumption)
- Update `README.md`

**`packages/ui/`**
- `components.json` (shadcn CLI config)
- `src/lib/cn.ts`
- `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/card.tsx` (shadcn-generated)
- `src/components/studio/studio-list.tsx`, `src/components/studio/studio-form.tsx` (composed, hand-written)
- `src/index.ts` (public exports: primitives + composed components + `cn`)
- Update `package.json` (dependencies from §9, `exports` field, drop `build`/keep `typecheck`)
- Update `tsconfig.json` if `exports`-based resolution needs a tweak (expected to already work as-is via the existing `react.json` base)
- Update `README.md`

**Root**
- `docs/meeting-notes/M6-implementation-report.md` (produced at implementation time, not now)

## 11. Files to Modify

- `eslint.config.mjs` — currently only imports `base` (plus the `apps/api`-specific NestJS override). Add a block applying `@st-manager/config-eslint/react` to `packages/ui/**/*.{ts,tsx}` (and, in M7/M8, `apps/web`/`apps/desktop`, but those globs can be added now harmlessly even before the apps have real source, or deferred to M7/M8 — **recommendation: add the `packages/ui` glob now since that's this milestone's actual code; leave `apps/web`/`apps/desktop` globs for M7/M8 to avoid touching files outside this milestone's scope**).
- `packages/theme/package.json`, `packages/config-tailwind/package.json`, `packages/ui/package.json` — as detailed in §10/§9.
- `packages/theme/README.md`, `packages/config-tailwind/README.md`, `packages/ui/README.md` — status updates, matching the pattern from every prior milestone report.
- `pnpm-lock.yaml` — regenerated by `pnpm install` after the above `package.json` changes.

No changes anticipated to: `turbo.json` (already anticipates `.next/**`/`dist/**` outputs), `pnpm-workspace.yaml`, root `package.json`, `packages/config-typescript/*` (the existing `react.json` preset already covers what's needed), any `apps/*` file, any `packages/{types,contracts,constants,validation,api-sdk,database}` file, or any ADR (no new architectural decision rises to ADR-level beyond what's already captured in this report — Tailwind v4 and the build-less `packages/ui` choice are implementation-detail decisions scoped to this milestone, not frozen-architecture changes).

## 12. Risks

1. **Tailwind v4 in a Tauri webview.** v4's generated CSS relies on `color-mix()` and cascade layers, which need a reasonably modern WebKit/Chromium/Edge engine. Desktop OS webview versions vary by end-user machine (WebView2 auto-updates on Windows; WKWebView tracks macOS version). Mitigation: this is a paper risk until M7 actually renders in a Tauri window — flagged now so it's a conscious tradeoff, not a surprise; Tailwind v3 remains a documented fallback if M7 hits real rendering issues.
2. **Cross-package Tailwind content detection.** v4's automatic source scanning does not reliably reach across package boundaries in a monorepo; each app's future CSS entry (added in M7/M8) must explicitly `@source` the `packages/ui` glob or utility classes used only inside shared components will be purged. Mitigation: documented explicitly in this report (§4) and again in the M7/M8 planning reports when they're written, not left as an implicit assumption.
3. **shadcn CLI non-interactivity.** The generator's `init` flow is interactive by default; running it inside an agent session requires the documented non-interactive flags. If those flags don't cover every needed prompt in the CLI's current version, `components.json` and the primitive components may need to be hand-authored to match shadcn's conventions instead of CLI-generated. Either path produces the same file shapes; only the mechanism differs.
4. **Build-less `packages/ui` is a pattern deviation.** Every other shared package (M1–M4) builds to `dist` via `tsc`. A source-exported UI package is standard practice industry-wide for this exact use case, but it does mean `packages/ui` can never be consumed by a plain-Node context (only bundler-based apps) — acceptable here since its only consumers are `apps/web` (Next) and `apps/desktop` (Vite), never `apps/api`.
5. **Committing generated CSS.** `packages/theme/src/css/tokens.css` is machine-generated from `src/themes/*.ts`. Committing it (recommended in §10) risks drift if someone hand-edits the CSS directly instead of regenerating it. Mitigation: a header comment in the generated file plus a `pnpm --filter @st-manager/theme build` check in validation (§13) that fails CI-style if the committed file doesn't match a fresh regeneration — worth deciding at implementation time.
6. **React version pinning across two apps.** `packages/ui` only declares a peer range; if `apps/web` (M8) and `apps/desktop` (M7) ever land on different React majors, shared components could misbehave in one app. Not a problem yet since neither app has React installed at all today — worth deciding the target React major (recommend latest stable 19.x) *before* M7 starts, likely as part of M7's own planning rather than M6's, but noted here since `packages/ui`'s peer range needs to be chosen consistently with that future decision.
7. **No automated visual verification exists yet.** Per the roadmap's own M6 Definition of Done, there's no Storybook/Chromatic in this repo. Verification is a manual/scripted smoke test (§13), which is weaker than automated visual regression testing — acceptable for this milestone's scope per the roadmap, revisited if/when a design-system-maturity milestone is added later.

## 13. Validation Strategy

1. `pnpm install` — after `package.json` changes, confirm workspace resolution succeeds and `pnpm-lock.yaml` updates cleanly.
2. `pnpm --filter @st-manager/theme build && pnpm --filter @st-manager/theme typecheck` — token generation + typecheck.
3. `pnpm --filter @st-manager/ui typecheck` — primitives + composed components typecheck against `packages/types`' `Studio` and against React's JSX types via the peer dependency.
4. `pnpm lint` — confirms the new `eslint.config.mjs` React block applies cleanly to `packages/ui/**` (React Hooks rules, JSX-aware parsing) with zero errors/warnings.
5. **Smoke-render test** (per the roadmap's own suggested approach): a throwaway scratch Vite app, created outside the committed workspace (e.g. `/tmp/st-manager-ui-smoke`) or in a git-ignored scratch folder, importing `@st-manager/ui` via a local `file:`/`link:` reference, rendering `Button`, `Input`, `Card`, and `StudioForm`/`StudioList` with sample `Studio` data. Used only to visually confirm Tailwind utility classes resolve and theme tokens apply (e.g. `bg-primary` renders the intended color) — not committed to the repository, screenshot captured for the implementation report as evidence, then deleted.
6. Root `pnpm typecheck`/`pnpm build` re-run in full to confirm no regression to the M2–M5 packages (`packages/storage`/`packages/ui`-adjacent empty-package `TS18003` caveat from prior milestones still applies to any package this milestone doesn't touch, e.g. `packages/ai`, `apps/desktop` itself, and is not a new issue).

## 14. Definition of Done

- `packages/theme` exports real color/spacing/radius/typography tokens and a light theme map; `src/css/tokens.css` is generated and committed; package builds and typechecks.
- `packages/config-tailwind` exports a single Tailwind v4 CSS preset consuming `packages/theme`'s tokens; documented as CSS-only (no JS/TS build).
- `packages/ui` has `Button`, `Input`, `Card` (shadcn-sourced) and composed `StudioList`/`StudioForm` (hand-written, presentational-only, typed against `packages/types`' `Studio`), exported from `src/index.ts`, with `cn()` in `src/lib`.
- `pnpm typecheck` and `pnpm lint` pass for all three touched packages with zero errors.
- A smoke-render test (§13.5) confirms the primitives and composed components render with theme tokens correctly applied, with evidence captured in the implementation report.
- No file inside `apps/web`, `apps/desktop`, or `apps/api` is created or modified — this milestone is strictly the shared-package foundation; wiring into a running app is M7 (desktop) and M8 (web).
- `docs/meeting-notes/M6-implementation-report.md` written at implementation time, matching the format of M2–M5's reports (executive summary, files changed, dependencies added, validation results, risks, next milestone).

---

**Open decisions requiring explicit approval before implementation** (summarized from §4–§10 above, so they can be answered in one pass rather than discovered mid-implementation):

1. Tailwind **v4** (CSS-first, no `tailwind.config.js`) vs. staying on v3 (JS preset, safer webview-compatibility track record) — recommendation: v4.
2. `packages/ui` as a **build-less, source-exported** package (deviating from the M1–M5 "build to `dist`" pattern) vs. giving it a `tsc` build step like other packages — recommendation: build-less.
3. Commit the **generated** `packages/theme/src/css/tokens.css` to the repo vs. generating it on demand via a `prebuild`/`prepare` script and gitignoring it — recommendation: commit it.
4. Run the real **`shadcn` CLI** (non-interactive flags) to generate `Button`/`Input`/`Card` vs. hand-authoring them directly to the same conventions (functionally identical output, different mechanism) — recommendation: attempt the CLI first, fall back to hand-authoring if the environment can't run it non-interactively.

Stopping here per instructions — no source code, dependencies, or commits have been touched. Awaiting review and approval of this plan (and the four decisions above) before implementing M6.
