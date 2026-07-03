# M8 Planning Report — Web Portal Bootstrap

- Date: 2026-07-03
- Milestone: M8 (Web Portal Bootstrap)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md), [docs/product-bible/README.md](../product-bible/README.md), root `README.md` (frozen architecture), ADR 0001, M4–M7 planning/implementation/commit reports
- Status: **Planning only — no application code, dependencies, scaffolding commands, or commits have been generated.** Awaiting approval before implementation.

## 1. Current Repository State

Repository history after M7 (`c22bc85`):

```
c48f8ba feat(database): implement Prisma 7 database layer            (M2)
5a337c2 feat(api): bootstrap NestJS API with health endpoint          (M3)
e4ec488 feat(contracts,sdk): add Studio API contracts and SDK thread  (M4)
5e9e616 feat(api): implement Studio CRUD feature module               (M5)
957abcd feat(ui): implement theme tokens, Tailwind v4 preset, and shared UI primitives (M6)
c22bc85 feat(desktop): bootstrap Tauri 2 shell with Studio list/create (M7)
```

What exists and is real going into M8:

- **`apps/api`** (M3, M5): NestJS server, `GET /health`, `POST /studios`, `GET /studios`, standardized `{ success, data, meta }` envelope, SQLite dev DB. **No CORS middleware** — confirmed in M7; browser clients cannot call `:4000` cross-origin without a proxy or CORS headers.
- **`packages/contracts`** (M4): `CreateStudioDto`, `StudioResponseDto`, `ListStudiosQueryDto`, `ListStudiosResponseDto`, `CreateStudioResponseDto`, `ApiErrorResponseDto`.
- **`packages/api-sdk`** (M4): `createHttpClient({ baseUrl })`, `createStudiosApi()`, `ApiError`. **`baseUrl` is always caller-supplied** — env resolution is an app-layer concern (established in M7).
- **`packages/constants`**, **`packages/validation`**, **`packages/types`**: shared Studio domain types and client-side validation (reused inside `api-sdk.createStudio()`).
- **`packages/theme`** (M6): design tokens including `layout.sidebarWidth`, `layout.headerHeight`, `layout.contentMaxWidth` — first consumed by M7 desktop shell.
- **`packages/config-tailwind`** (M6): `src/preset.css` — Tailwind v4 CSS-first preset; README documents **PostCSS path for Next.js** (`@tailwindcss/postcss`) vs Vite path for desktop.
- **`packages/ui`** (M6): build-less source export; `Button`, `Input`, `Card`, presentational `StudioList`/`StudioForm` (`"use client"` already on interactive composed components). **No `api-sdk` imports inside `packages/ui`.**
- **`apps/desktop`** (M7): working reference implementation for the same Studio feature — app shell (header + sidebar), `StudiosPage` data wiring, `api-client.ts`, Vite dev proxy for CORS, workspace source aliases for CommonJS bundling. **M8 should mirror this feature set, not reinvent it.**
- **`eslint.config.mjs`**: React preset scoped to `packages/ui/**` and `apps/desktop/**`; **`apps/web/**` glob explicitly deferred to M8** (comment in file).
- **Frozen architecture:** Next.js is **Studio Web Portal only in V1**; always online via `@st-manager/api-sdk`; no embedded DB in web.
- **Toolchain (verified in prior milestones):** Node 20.20.2, pnpm 9.0.0.

What is pure scaffolding today (this milestone's actual target):

```
apps/web/
  README.md                        (status: scaffolding only)
  package.json                     (name/description only, typescript devDep, typecheck script)
  tsconfig.json                    (extends packages/config-typescript/react.json, outDir .next)
  public/.gitkeep
  src/app/.gitkeep
  src/components/.gitkeep
  src/hooks/.gitkeep
  src/lib/.gitkeep
  src/styles/.gitkeep
```

No `next.config.ts`, no `postcss.config.mjs`, no App Router pages, no React/Next.js dependency installed. `apps/web/tsconfig.json` already extends the shared React preset; **will likely need adjustment** for Next.js-specific compiler options (`next-env.d.ts`, `plugins: [{ name: "next" }]`) during implementation — flagged as an expected, small deviation, not a blocker.

**Product bible note:** `docs/product-bible/README.md` remains index-only. M8 scope is the roadmap's verbatim Definition of Done: **same Studio list/create feature in the browser**, reusing M4–M6 foundation. No speculative screens beyond Studios.

## 2. M8 Goal (from the Roadmap, Verbatim Scope)

> **Goal:** the same Studio feature, in the browser, reusing the same foundation.
>
> - Next.js App Router bootstrap in `apps/web`, same list/create feature via `packages/api-sdk` and `packages/ui`.
>
> **Depends on:** M4, M5, M6.
>
> **Definition of done:** `pnpm --filter @st-manager/web dev` serves a page with the same Studio list/create functionality.

M8 does **not** depend on M7 (both consume the same foundation independently), but M7's implementation is the **closest in-repo reference** for shell layout, API wiring patterns, and CORS workarounds. This plan deliberately aligns web with desktop where it reduces drift, while respecting Next.js idioms (App Router, `next/link`, Server/Client Components) where they differ.

## 3. Next.js App Router Architecture

**Scaffold approach:** bootstrap via `pnpm create next-app` (or equivalent non-interactive flags) targeting the **App Router + TypeScript + Tailwind CSS + ESLint** template, merged into the existing `apps/web` folder layout (same class of mechanical step as M7's `tauri init --ci`). If the generator cannot run non-interactively, hand-author `next.config.ts`, `postcss.config.mjs`, and minimal App Router files from a known-good Next.js 15 + React 19 template — functionally identical output, different mechanism (M7 precedent).

Key architectural choices:

| Setting | Decision | Rationale |
|---|---|---|
| Next.js major | **15.x** (latest stable) | Aligns with React 19 already used in M6/M7; App Router is the only target per frozen architecture. |
| Router | **App Router only** (`src/app/`) | Frozen architecture; no Pages Router. |
| Default port | **3000** (Next.js default) | No collision with API (`4000`) or desktop Vite (`1420`). |
| Bundler (dev) | Next.js default (**Turbopack** in Next 15) | No custom webpack config unless `transpilePackages` proves insufficient for workspace packages. |
| Server Components | Root `layout.tsx` may be a Server Component; **all interactive/data-fetching UI is Client Components** | Matches M6's `"use client"` on `StudioForm`; `StudiosPage` and sidebar active-state need hooks. |
| Auth | **None** | Deferred to M10 per roadmap. |
| Metadata | Minimal — `title: "ST Manager"` | No SEO/marketing scope in M8. |

## 4. App Shell Layout

Mirror M7's persistent shell so both clients share the same information architecture:

```
┌─────────────────────────────────────────────┐
│  Top Header  (app name, reserved actions)   │
├───────────┬─────────────────────────────────┤
│           │                                 │
│  Sidebar  │     Route Content             │
│  (nav)    │     (Studios page in M8)       │
│           │                                 │
└───────────┴─────────────────────────────────┘
```

- **`src/components/shell/AppShell.tsx`** — layout wrapper: fixed-width sidebar (`layout.sidebarWidth` from `@st-manager/theme`), header (`layout.headerHeight`), scrollable `<main>` for `{children}`.
- Built from `packages/ui` primitives + semantic HTML + Tailwind tokens (`bg-background`, `border-border`, etc.) — **no new design tokens at the app layer** (M6/M7 principle).
- **`src/app/layout.tsx`** — root layout: imports `globals.css`, wraps all pages in `AppShell`, renders `{children}` in the main content region.
- Shell has **no `api-sdk` dependency** — only route content fetches data (same layering as M7).

**Deliberate folder choice:** shell components live in `src/components/shell/` (not `src/app/shell/`) because Next.js reserves `src/app/` for routes and layouts; M7 used `src/app/shell/` under Vite where `app/` is not a routing convention. Functionally identical; path differs only because of framework conventions.

## 5. Top Header

Same contract as M7 (`apps/desktop/src/app/shell/Header.tsx`):

- Left: plain text **"ST Manager"** (no logo asset — none exists in repo).
- Right: reserved empty slot (`data-slot="header-actions"`) for future auth (M10) or status indicators (M9/M11).
- Height: `layout.headerHeight` from `@st-manager/theme`.
- No search, breadcrumbs, or command palette — out of scope.

## 6. Sidebar Architecture

- **`src/components/shell/Sidebar.tsx`** + **`src/components/shell/nav-items.ts`** — typed static config: `{ label, href, icon }`.
- **M8 ships exactly one nav item: "Studios"** → `href: "/studios"`. Extensible `.map()` over config; no invented filler routes (M7 precedent).
- Icons: `lucide-react` (`Building2`), declared in `apps/web` (not re-exported from `packages/ui`).
- Active-route highlighting via **`usePathname()`** from `next/navigation` compared against `nav-items[].href` — not `react-router` (web uses Next.js routing exclusively).
- Sidebar is a **Client Component** (`"use client"`) because `usePathname()` requires it.
- No collapse toggle or nested nav in M8.

## 7. Navigation System

- Sidebar + header are the only navigation chrome (no in-content breadcrumbs/tabs for a single screen).
- Links use **`next/link`** — never raw `<a href>` for internal routes, never `window.location` for programmatic navigation.
- **`src/app/page.tsx`** redirects to `/studios` via `redirect()` from `next/navigation` (Server Component redirect) or equivalent — one canonical Studios route.

## 8. Routing

Next.js App Router file-based routes (no `react-router` — that is desktop-only per M7 decision):

```
/               → redirect to /studios   (src/app/page.tsx)
/studios        → Studios screen         (src/app/studios/page.tsx)
```

No `/settings`, `/login`, or other route stubs.

**Client boundary split (recommended):**

- `src/app/studios/page.tsx` — thin Server Component page that renders `<StudiosPageClient />`.
- `src/components/studios/StudiosPageClient.tsx` (or `src/app/studios/StudiosPageClient.tsx`) — `"use client"` component owning fetch state and rendering `StudioList`/`StudioForm`.

This keeps the App Router page file minimal and concentrates interactive logic in one client module (easier to test and mirrors M7's `StudiosPage.tsx` structure).

## 9. API SDK Integration Points

- **`src/lib/api-client.ts`** — single place `createHttpClient()` + `createStudiosApi()` are instantiated.

  ```ts
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (process.env.NODE_ENV === "development" ? "" : "http://localhost:4000");
  ```

  **Note:** Next.js exposes only `NEXT_PUBLIC_*` vars to the browser; this mirrors M7's `VITE_*` convention with the framework-appropriate prefix.

- **`apps/web/.env.example`** — documents `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`, aligned with `infra/env/.env.example`'s `API_BASE_URL` (same value, different prefix — same rationale as M7's `.env.example`).

- **Dev CORS strategy (recommended — see §12 open decision #1):** `next.config.ts` **rewrites** proxy `/studios` and `/health` to `http://localhost:4000`, and `api-client.ts` uses an empty/`""` base URL in development so browser requests hit the Next.js origin (`:3000`) and are forwarded server-side — **parallel to M7's Vite proxy**, avoids modifying `apps/api` in M8.

- **Production:** `NEXT_PUBLIC_API_BASE_URL` must point at the real API; CORS on the API (or a reverse proxy) becomes a deployment concern — same known limitation as M7 production Tauri builds, documented not hidden.

- **`getAuthHeaders`:** not implemented (reserved M10).

- **`studiosApi.listStudios()` / `createStudio()`:** called **only from the Studios client page** — never from shell components or `packages/ui`.

- **DTO → domain mapping:** same `toStudio()` helper as M7 (`StudioResponseDto.createdAt: string` → `Studio.createdAt: Date`) lives in the client page module, not in `packages/ui`.

## 10. Tailwind CSS Integration

Per M6 README and planning report §8:

- **`postcss.config.mjs`** — `@tailwindcss/postcss` plugin (Next.js path, distinct from desktop's `@tailwindcss/vite`).
- **`src/styles/globals.css`** — same content pattern as M7:

  ```css
  @import "@st-manager/config-tailwind/preset.css";
  @source "../../../../packages/ui/src/**/*.{ts,tsx}";
  @source "../**/*.{ts,tsx}";
  ```

- Imported once from `src/app/layout.tsx`.
- **`@source` is mandatory** — first real test of cross-package content detection in Next.js (M6 risk #2); M7 validated it under Vite, M8 validates under PostCSS/Turbopack.

## 11. Monorepo / Workspace Package Consumption

Next.js must transpile workspace packages that ship TSX/TS source:

```ts
// next.config.ts (conceptual)
const nextConfig = {
  transpilePackages: [
    "@st-manager/ui",
    "@st-manager/theme",
    "@st-manager/api-sdk",
    "@st-manager/contracts",
    "@st-manager/types",
    "@st-manager/constants",
    "@st-manager/validation",
  ],
  // rewrites + optional webpack alias — see §9 and §14
};
```

**M7 lesson:** Vite required **source aliases** because Rollup could not statically analyze CommonJS `dist` from `@st-manager/api-sdk` → `@st-manager/constants`. Next.js/Turbopack may handle this natively via `transpilePackages`, or may need **`webpack` resolve aliases to `packages/*/src`** as a fallback — to be confirmed during implementation, not assumed (§14 risk #1).

## 12. Folder Structure

Building inside the existing `apps/web/` scaffold:

```
apps/web/
  next.config.ts                    # new — transpilePackages, dev rewrites
  postcss.config.mjs                # new — @tailwindcss/postcss
  next-env.d.ts                     # new — generated/committed by Next.js
  .env.example                      # new — NEXT_PUBLIC_API_BASE_URL
  package.json                      # modified — real deps + scripts
  tsconfig.json                     # likely modified — Next.js plugin/paths
  README.md                         # modified — status: implemented

  src/
    app/
      layout.tsx                    # new — root layout, globals.css, AppShell
      page.tsx                      # new — redirect to /studios
      studios/
        page.tsx                    # new — thin server page → client component
    components/
      shell/
        AppShell.tsx                # new
        Header.tsx                  # new
        Sidebar.tsx                 # new — "use client"
        nav-items.ts                # new
      studios/
        StudiosPageClient.tsx       # new — "use client", data + UI wiring
    lib/
      api-client.ts                 # new
    styles/
      globals.css                   # new — Tailwind entry + @source
```

Remove superseded `.gitkeep` files when real content lands (same as M6/M7). `src/hooks/` may remain empty with `.gitkeep` — no custom hooks required in M8.

## 13. Dependencies Required and Justification

All additions scoped to **`apps/web` only**. No changes to `apps/api`, `apps/desktop`, or any `packages/*` implementation (except `eslint.config.mjs` glob extension).

| Dependency | Type | Why |
|---|---|---|
| `next` | dependency | App Router framework (frozen architecture). |
| `react`, `react-dom` | dependency | Satisfy `packages/ui` peer deps; same major as desktop (19.x). |
| `@st-manager/ui`, `@st-manager/theme`, `@st-manager/api-sdk`, `@st-manager/contracts`, `@st-manager/types`, `@st-manager/constants`, `@st-manager/validation` | dependency (workspace) | Shared foundation — same set as M7 desktop. |
| `@st-manager/config-tailwind` | devDependency (workspace) | `globals.css` `@import` source. |
| `@tailwindcss/postcss` | devDependency | Tailwind v4 Next.js integration path (M6 README). |
| `postcss` | devDependency | Required peer for `@tailwindcss/postcss`. |
| `lucide-react` | dependency | Sidebar nav icons (same as M7). |
| `@types/react`, `@types/react-dom` | devDependency | Local typecheck for TSX. |
| `typescript` | devDependency | Already present; version unchanged. |

**Not added:** `react-router` (Next.js owns routing), `@tauri-apps/*`, Vite plugins.

No dependency added to root `package.json`.

## 14. Files to Create

(See §12 for paths.) Additionally:

- `docs/meeting-notes/M8-implementation-report.md` — produced at implementation time, not now.

## 15. Files to Modify

- `apps/web/package.json` — scripts: `dev`, `build`, `start`, `typecheck`; dependencies from §13.
- `apps/web/tsconfig.json` — Next.js compiler plugin, path alias `@/*` → `./src/*` if not already present.
- `apps/web/README.md` — status, dev workflow (`api dev` + `web dev`).
- `eslint.config.mjs` — add `apps/web/**/*.{ts,tsx}` to React preset glob (comment in file already anticipates this).
- `pnpm-lock.yaml` — regenerated by `pnpm install`.

**Explicitly not modified:** `apps/api`, `apps/desktop`, any `packages/*` source, `turbo.json` (already lists `.next/**` outputs), frozen architecture docs.

## 16. Risks

1. **CommonJS workspace package bundling (carried from M7).** `@st-manager/api-sdk` compiles to CommonJS `dist`; Next.js/Turbopack may fail similarly to Vite/Rollup. Mitigation: `transpilePackages` first; fallback webpack aliases to TypeScript source (M7 pattern) scoped to `next.config.ts` only.

2. **CORS in production.** Dev rewrites solve local development without `apps/api` changes; production Next.js static/server deployment calling a separate API origin still needs API CORS or a shared reverse proxy. Same class of limitation as M7 §8; acceptable for M8 Definition of Done (dev-time list/create), documented explicitly.

3. **Tailwind v4 `@source` under PostCSS/Turbopack.** M7 validated `@source` under Vite; M8 is the first Next.js/PostCSS test. Mitigation: inspect compiled CSS for missing utilities if components render unstyled; adjust `@source` globs relative to `globals.css` location.

4. **`"use client"` boundary placement.** Putting too much in Server Components breaks interactivity; putting unnecessary modules in Client Components bloats the bundle. Mitigation: follow §8 split — shell sidebar + Studios page as client; root layout stays server where possible.

5. **`create-next-app` non-interactivity.** Same mechanical risk as M7's `tauri init` / M6's shadcn CLI. Mitigation: documented non-interactive flags; hand-author fallback.

6. **Root `pnpm typecheck` empty-package failures.** Pre-existing `TS18003` on scaffold-only packages; unrelated to M8. Validate `@st-manager/web` in isolation like M7.

7. **Intentional divergence from desktop routing.** Desktop uses hash routing (`react-router`); web uses path-based App Router. Deep-linking and refresh behavior differ by design — not a bug, but worth noting so M8 is not mistaken for a shared routing layer.

8. **No product bible screen specs.** Shell mirrors M7's extensible-but-minimal nav; if product docs later define a different IA, shell assumptions should be re-checked before adding routes.

## 17. Validation Strategy

1. `pnpm install` — after `apps/web/package.json` changes; confirm lockfile updates.
2. `pnpm --filter @st-manager/web typecheck` — isolated Next.js + workspace package types.
3. `pnpm lint` — confirm extended `eslint.config.mjs` React glob covers `apps/web/**` with zero errors/warnings.
4. `pnpm --filter @st-manager/web build` — production Next.js build succeeds (static/server output as configured).
5. **Live end-to-end (roadmap Definition of Done):**

   ```bash
   # Terminal 1
   pnpm --filter @st-manager/api dev

   # Terminal 2
   pnpm --filter @st-manager/web dev
   ```

   Confirm in browser at `http://localhost:3000/studios`:
   - Shell renders (header + sidebar with active "Studios" item).
   - Studio list loads from real API (or empty state if DB is empty).
   - Create a new studio via `StudioForm`; new row appears without manual refresh.
   - `curl http://localhost:4000/studios` independently confirms the created row.

6. Root `pnpm build` re-run — confirm no regression to M0–M7 packages/apps.
7. Screenshot of running web app captured for the implementation report (`docs/meeting-notes/assets/m8-web-studios.png`).

## 18. Definition of Done

- `apps/web` is a real Next.js App Router application (no more `.gitkeep`-only scaffolding).
- `pnpm --filter @st-manager/web dev`, alongside live `apps/api dev`, serves `/studios` with list + create backed by a real database round-trip.
- App shell (header + sidebar + one "Studios" nav item) renders using `packages/ui`, `packages/theme`, and `packages/config-tailwind`.
- `pnpm --filter @st-manager/web typecheck`, `pnpm lint`, and `pnpm --filter @st-manager/web build` pass with zero new errors.
- No file inside `apps/api`, `apps/desktop`, or any `packages/*` is modified except `eslint.config.mjs` (React glob extension).
- `docs/meeting-notes/M8-implementation-report.md` written at implementation time (executive summary, files changed, dependencies, validation including e2e + screenshot, risks, next milestone).
- Nothing committed until implementation report is reviewed and approved (M1–M7 workflow).

---

**Open decisions requiring explicit approval before implementation** (summarized for one-pass review):

1. **Dev API access / CORS:** Next.js **`rewrites` proxy** to `http://localhost:4000` (recommended — mirrors M7 Vite proxy, no `apps/api` change) vs. **enable CORS on `apps/api`** (broader fix, but out of stated M8 scope and touches another app).

2. **Shell parity with desktop:** build the **same header + sidebar shell** as M7 (recommended — consistent IA, extensible nav) vs. a **minimal single-page layout** without sidebar (smaller diff, but diverges from desktop and M7's deliberate shell investment).

3. **Data fetching:** **plain `useEffect`/`useState`** like M7 (recommended — consistent, no new dependency) vs. **TanStack Query** (deferred from M7; still premature for one screen unless explicitly desired now).

4. **Scaffold mechanism:** run **`create-next-app` non-interactively** into `apps/web` (recommended) vs. **hand-author** all Next.js config/files (M7 `tauri init` fallback precedent).

Stopping here per instructions — no source code, dependencies, scaffolding commands, or commits have been touched. Awaiting review and approval of this plan (and the four decisions above) before implementing M8.
