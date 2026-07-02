# @st-manager/ui

Shared shadcn/ui primitives and composed React components consumed by both `@st-manager/web` and `@st-manager/desktop`. Build-less: exports TSX **source** directly (`"exports": { ".": "./src/index.ts" }`, no `dist`) — the consuming app's own bundler (Next.js, Vite) transpiles it, avoiding a stale-`dist` class of bugs. This deliberately deviates from the "build to `dist`" pattern used by `packages/types`/`packages/contracts`/etc., since this package is only ever consumed by bundler-based apps, never by plain Node (unlike `packages/database`/`packages/validation`, which `apps/api` needs pre-compiled).

- `src/components/ui/` — shadcn-sourced primitives: `Button`, `Input`, `Card` (+ `CardHeader`/`CardTitle`/`CardDescription`/`CardAction`/`CardContent`/`CardFooter`).
- `src/components/studio/` — composed, hand-written `StudioList`/`StudioForm`, typed against `@st-manager/types`' `Studio`. **Presentational only** — no `@st-manager/api-sdk` import, no data fetching; they take data/callbacks as props so each app (M7 desktop, M8 web) owns its own data-fetching strategy.
- `src/lib/cn.ts` — the standard shadcn `clsx` + `tailwind-merge` class-merging helper.
- `src/hooks/` — reserved for future reusable UI behavior hooks; empty as of M6 (no component needed one yet).
- `components.json` — shadcn CLI config, kept for any *future* component additions. The M6 primitives themselves were hand-authored to shadcn's exact conventions rather than CLI-generated (the CLI's framework detection targets a full Next.js/Vite app, not a standalone library package like this one) — see the M6 implementation report for details.

`react`/`react-dom` are `peerDependencies` (apps supply their own copy, avoiding duplicate React); `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot` are direct dependencies. Styling assumes `@st-manager/config-tailwind`'s preset is loaded by the consuming app — this package has no Tailwind/PostCSS config of its own.

Status: implemented (M6). Not yet wired into any app — that happens in M7 (desktop) / M8 (web).
