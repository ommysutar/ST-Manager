# M7 Planning Report — Desktop Shell Bootstrap

- Date: 2026-07-03
- Milestone: M7 (Desktop Shell Bootstrap — first running desktop app)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md), [docs/product-bible/README.md](../product-bible/README.md), root `README.md` (frozen architecture), ADR 0001 (desktop local data access strategy), M4–M6 implementation reports
- Status: **Planning only — no application code, dependencies, scaffolding commands, or commits have been generated.** Awaiting approval before implementation.

## 1. Current Repository State

Repository history after M6 (`957abcd`):

```
c48f8ba feat(database): implement Prisma 7 database layer            (M2)
5a337c2 feat(api): bootstrap NestJS API with health endpoint          (M3)
e4ec488 feat(contracts,sdk): add Studio API contracts and SDK thread  (M4)
5e9e616 feat(api): implement Studio CRUD feature module               (M5)
957abcd feat(ui): implement theme tokens, Tailwind v4 preset, and shared UI primitives (M6)
```

What exists and is real going into M7:

- **`apps/api`** (M3, M5): NestJS server, `GET /health`, `POST /studios`, `GET /studios`, standardized `{ success, data, meta }` response envelope, running on `API_PORT` (default `4000`) against SQLite in dev.
- **`packages/contracts`** (M4): `CreateStudioDto`, `StudioResponseDto`, `ListStudiosQueryDto`, `ListStudiosResponseDto`, `CreateStudioResponseDto`, `ApiErrorResponseDto`.
- **`packages/api-sdk`** (M4): `createHttpClient(config: ApiClientConfig): HttpClient` (native `fetch`, `get`/`post` only), `createStudiosApi(client): StudiosApi` (`listStudios()`, `createStudio()`), `ApiError` (normalized network/HTTP error class). `ApiClientConfig.baseUrl` is **always caller-supplied** — the SDK deliberately never reads `process.env`/`import.meta.env` itself (noted explicitly in its own source), which means resolving a real base URL from Vite's env is entirely M7's responsibility.
- **`packages/constants`**: `ROUTES.STUDIOS = "studios"`, `API_ERROR_CODES`, pagination limits.
- **`packages/validation`**: `createStudioSchema` (Zod), already reused client-side inside `packages/api-sdk`'s `createStudio()` before the request is sent.
- **`packages/theme`** (M6): design tokens, `light`/`dark` semantic theme maps, generated `src/css/tokens.css` (`:root`/`.dark` custom properties).
- **`packages/config-tailwind`** (M6): `src/preset.css` — Tailwind v4 CSS-first preset (`@theme inline`, `@custom-variant dark`), importable by any bundler-based app.
- **`packages/ui`** (M6): build-less, source-exported (`"exports": { ".": "./src/index.ts" }`). Primitives `Button`, `Input`, `Card` (+ subcomponents); composed, **presentational-only** `StudioList` (`{ studios: Studio[] }`) and `StudioForm` (`{ onSubmit, isSubmitting? }`, `"use client"`-annotated, local-state only). Neither composed component imports `api-sdk` or fetches anything — that wiring is explicitly deferred to the app layer, i.e. this milestone.
- **ADR 0001** (M0): desktop is **online-only** for M7 — calls `apps/api` over HTTP via `packages/api-sdk`, no embedded SQLite, no local database of any kind. Embedded SQLite + sync is M11.
- **Toolchain verified installed and working in this environment:** Node 20.20.2, pnpm 9.0.0, Rust/Cargo 1.96.1, `tauri-cli` 2.11.4 (confirmed via `pnpm exec tauri -V` before writing this report).

What is pure scaffolding today (this milestone's actual target):

```
apps/desktop/
  README.md                        (status: scaffolding only)
  package.json                     (name/description only, typescript devDep, typecheck script)
  tsconfig.json                    (extends packages/config-typescript/react.json, outDir/rootDir set)
  src/components/.gitkeep
  src/hooks/.gitkeep
  src/lib/.gitkeep
  src/styles/.gitkeep
  src-tauri/capabilities/.gitkeep
  src-tauri/icons/.gitkeep
  src-tauri/src/.gitkeep
```

No `vite.config.ts`, no `index.html`, no `src/main.tsx`/`App.tsx`, no `src-tauri/Cargo.toml`/`tauri.conf.json`/`main.rs`, no React/Vite/Tauri dependency installed anywhere. `apps/desktop/tsconfig.json` already sets `jsx: "react-jsx"` and DOM libs via the shared `react.json` preset, so no TypeScript config changes are anticipated (§10).

**Product bible note:** `docs/product-bible/README.md` is index-only ("content to be authored") — there is no feature spec, persona doc, or screen list yet beyond what the roadmap itself describes (`Studio` list + create). This plan therefore treats the roadmap's M7 definition as the authoritative scope, and deliberately designs the shell/navigation to be **extensible** rather than guessing at future screens that don't exist in any document yet (§5, §6).

## 2. M7 Goal (from the Roadmap, Verbatim Scope)

> `pnpm tauri dev` opens a window showing the Studio list, backed by the real API... Desktop talks to the API over plain HTTP... no local SQLite yet, no auth yet.
>
> **Definition of done:** running `apps/api` in one terminal and `pnpm --filter @st-manager/desktop tauri dev` in another produces a native window that lists and creates studios, backed by a real database round-trip. **This is the target "smallest working vertical slice that can eventually become a running desktop application."**

Everything below designs toward exactly that, while building the surrounding **shell** (window chrome, sidebar, header, navigation, routing) with just enough real structure that adding a second screen later (M8 parity screens, M11 sync status, M12 AI features) is a matter of adding a route and a nav item — not a rewrite. The shell is real; the number of screens behind it (one: Studios) is intentionally still small, matching the roadmap.

## 3. Tauri Window Structure

**Scaffold approach:** rather than freehand-authoring `src-tauri/Cargo.toml`/`tauri.conf.json`/`main.rs` from scratch, run `pnpm create tauri-app` (or `cargo tauri init` against the existing `apps/desktop` folder) in **non-interactive/flag mode**, targeting the React + TypeScript + Vite template, then relocate/merge its output into the already-scaffolded `apps/desktop/src`/`src-tauri` folders rather than letting the generator create a parallel folder structure. This matches the roadmap's own phrasing ("`create-tauri-app`-equivalent output, respecting the folder layout already scaffolded"). Flagged as a mechanical risk in §12 (generators are sometimes interactive-only for certain prompts, same class of risk as the M6 shadcn CLI).

Key `tauri.conf.json` decisions:

| Setting | Decision | Rationale |
|---|---|---|
| `productName` / `identifier` | `ST Manager` / `com.stmanager.desktop` | First real branding artifact; reversible later, needs *some* value to init. |
| `app.windows[0].title` | `"ST Manager"` | Shown in native title bar (or custom header bar — see below). |
| `app.windows[0].width` / `height` | `1280 x 800`, `minWidth: 960`, `minHeight: 600` | Enterprise desktop app default; sidebar + content needs realistic minimum width. |
| `app.windows[0].decorations` | **Open decision — see §3.1** | Native OS chrome vs. custom title bar. |
| `build.devUrl` | Vite dev server (`http://localhost:1420` — Tauri's conventional default dev port, distinct from `apps/web`'s Next.js port and `apps/api`'s `4000`) | Standard Tauri+Vite pairing; avoids port collision with the API or a future `apps/web` dev server. |
| `build.frontendDist` | `../dist` (Vite build output) | Standard. |
| `bundle.active` | `true`, targets left at Tauri defaults for the host OS | No cross-compilation/signing in M7 (that's M13). |
| `app.security.csp` | Left at Tauri's secure default; **`apps/api`'s dev URL (`http://localhost:4000`) must be reachable** — Tauri 2's default CSP permits `http(s)` fetches from JS by default (unlike WebView `<img>`/asset restrictions), so no CSP relaxation is expected to be necessary; verified during implementation, not assumed. |

### 3.1 Open decision: window chrome (native vs. custom title bar)

Two options:

1. **Native OS decorations** (`decorations: true`, default Tauri behavior). Fastest to ship, zero extra code, standard OS title bar + traffic lights/minimize-maximize-close.
2. **Custom/frameless title bar** (`decorations: false`, `titleBarStyle: "Overlay"` on macOS or fully custom on all platforms), with the "Top header" (§5) doubling as a draggable region (`data-tauri-drag-region`) and hosting custom window controls. This is the common pattern for polished, branded desktop apps (e.g. VS Code, Linear, Notion) and lines up with the user's explicit ask for a designed "Top header."

**Recommendation: Option 1 (native decorations) for M7.** Reasoning: M7's roadmap-defined done-criteria is "list and create studios," not window chrome polish; a custom title bar adds real cross-platform complexity (traffic-light positioning on macOS, custom minimize/maximize/close buttons + `getCurrentWindow()` calls on Windows/Linux, drag-region CSS quirks) that has nothing to do with proving the vertical slice. The Top header (§5) is still designed and built as a real, permanent app-header component — it just doesn't also have to be the OS window's title bar in M7. Revisiting a custom title bar is a pure polish task that can happen any time after M7 without touching the Studio feature at all. **Flagged for explicit approval — if a branded frameless window is a hard product requirement now, say so and this section's plan changes before implementation, not after.**

## 4. App Shell Layout

A single persistent shell component wraps every route:

```
┌─────────────────────────────────────────────┐
│  Top Header  (app name, (future) global actions) │
├───────────┬───────────────────────────────────┤
│           │                                   │
│  Sidebar  │        Route Content              │
│  (nav)    │        (Studios screen in M7)      │
│           │                                   │
│           │                                   │
└───────────┴───────────────────────────────────┘
```

- `src/app/shell/AppShell.tsx` — the layout component: fixed-width sidebar (uses `layout.sidebarWidth` from `packages/theme`'s spacing tokens — already defined in M6, previously unconsumed by any app, now given its first real consumer), header pinned to the top spanning the content column, a scrollable main content region rendering the active route via the router's outlet.
- Built entirely from `packages/ui` primitives (`Card` for content sectioning, `Button` for nav items/actions) plus plain semantic HTML (`<aside>`, `<header>`, `<main>`) styled with Tailwind utility classes resolving to `packages/theme` tokens (`bg-background`, `border-border`, etc.) — no new design tokens invented at the app layer, per M6's "no duplicated styles" principle carried forward.
- The shell itself has no data dependency on `packages/api-sdk` — only route content does. This keeps the shell trivially reusable if `apps/web` (M8) ever wants a similar layout (not required now, just a side-effect of clean layering).

## 5. Top Header

A slim, fixed-height bar (`layout.headerHeight` token from `packages/theme`, already defined, previously unconsumed):

- Left: app name/logo mark (plain text `"ST Manager"` for M7 — no logo asset exists yet; a real logo/icon is a design asset that doesn't exist in this repo and is out of scope to fabricate here).
- Right: reserved, empty slot for M7 (no user menu — no auth yet per ADR 0001/roadmap M10; no notifications — no such feature exists yet). Built as an explicit empty `<div className="flex-1" />`-style spacer + reserved slot rather than omitted entirely, so M10 (auth/user menu) and M9 (e.g. a sync/connection status indicator) can add to it without restructuring the header component.
- No global search, breadcrumbs, or command palette in M7 — none of these exist in any product spec and would be speculative scope creep beyond "list and create studios."

## 6. Sidebar Architecture

- `src/app/shell/Sidebar.tsx` + `src/app/shell/nav-items.ts` (a small, typed, static config array — **not** a dynamic/permission-driven menu, since roles/permissions are explicitly TBD until M10): each entry is `{ label: string; href: string; icon: LucideIcon }`.
- **M7 ships exactly one real nav item: "Studios"**, pointing at the app's root/default route. The sidebar component itself supports N items (it's a `.map()` over `nav-items.ts`), because building a sidebar that can only ever render one item is not meaningfully simpler than one that renders a list of one — but **no second nav item is invented** to fill space; that would imply a screen/feature that doesn't exist. This is the concrete way "don't paint into a corner" (M6's phrase, carried forward) applies to M7's shell.
- Active-route highlighting via the router's own "is active" mechanism (§8) rather than manual state — avoids a duplicate source of truth for "what screen am I on."
- Icons from `lucide-react` (already a `packages/ui` dependency from M6) — e.g. `Building2` for "Studios."
- No collapse/expand toggle, no nested/grouped nav sections in M7 — again, would be speculative given a one-item menu; trivial to add later without restructuring (`nav-items.ts` already supports adding a `children` field whenever that's real).

## 7. Navigation System

- The sidebar (§6) and the header (§5) are the only navigation *chrome*. There is no in-content breadcrumb or tab system in M7 — one screen doesn't need wayfinding beyond "which sidebar item is highlighted."
- Programmatic navigation (e.g. after a successful `createStudio()` call, if a future screen needs a redirect) goes through the router's own navigate function (§8), never `window.location` — irrelevant to prove in M7 with only one route, but stated now so M8+ additions follow the same convention from the start.

## 8. Routing

**Open decision:** with exactly one real screen, a full routing library is arguably more machinery than the milestone needs — but the user's explicit M7 requirements list "Routing" as a first-class concern, and the roadmap's own shell framing (sidebar + header + content) implies more than one screen is coming (M9's storage/logging are backend-only and don't need a screen, but M11's sync status and M12's AI feature almost certainly will). Two real options:

1. **`react-router` (v7, "declarative" data mode, framework-agnostic — not the Remix/framework flavor, which assumes a server).** Industry-standard, well-documented Tauri+Vite+React-Router integration (client-side routing only, `createBrowserRouter` or `createHashRouter`). Adds one real dependency.
2. **No routing library — a minimal hand-rolled route registry** (`src/app/router.ts`: a `{ [path]: Component }` map + a tiny `useState`-backed "current path" context, no URL sync). Zero new dependency, but reinvents address-bar-URL semantics (deep linking, back/forward) that `react-router` gives for free, and would need to be replaced by a real router the moment M8/M11/M12 add a second real screen anyway.

**Recommendation: `react-router` (v7, declarative mode), using `createHashRouter` rather than `createBrowserRouter`.** Rationale for hash-based routing specifically: Tauri's production build serves the frontend from the local filesystem/custom protocol (`tauri://localhost` or platform equivalent), not a real HTTP server with server-side path fallback — hash routing (`#/studios`) avoids any "refresh on a deep path 404s" class of problem that `createBrowserRouter` can hit in that environment, at the cost of a `#` in the URL bar that (a) desktop end users never see by default in a Tauri window without an address bar, and (b) doesn't matter for `apps/web`'s own separate M8 Next.js routing (Next has its own router entirely — this decision is scoped to `apps/desktop` only). **Flagged for explicit approval** since it's a real new dependency choice, not an internal implementation detail.

Routes for M7:

```
/               → redirect to /studios
/studios        → Studios screen (list + create, §9)
```

No `/settings`, `/login`, or other route stubs are pre-created — same "don't invent scope" principle as §6.

## 9. Studios Screen (the One Real Route)

- `src/app/studios/StudiosPage.tsx` — the only feature screen in M7. Owns:
  - Local state: `studios: Studio[]`, `isLoading`, `error`, `isSubmitting`.
  - On mount: calls `studiosApi.listStudios()` (plain `useEffect`, **no React Query/SWR** — see §9.1) and populates state.
  - Renders `packages/ui`'s `StudioList` with the fetched data (loading/error states rendered by `StudiosPage` itself around `StudioList`, since `StudioList` is presentational-only per M6's design and has no concept of loading/error).
  - Renders `packages/ui`'s `StudioForm`, wiring its `onSubmit` to `studiosApi.createStudio()`; on success, either re-fetches the list or optimistically appends the new `StudioResponseDto` to local state (implementation-time choice, not architecture-level — re-fetching is simpler and correct for M7's scale, optimistic append is a pure optimization deferred unless trivial).
  - Surfaces `ApiError` (from `packages/api-sdk`) messages directly (`error.message`) in a simple inline error region — no toast/notification system exists yet (that would be new UI-package scope, not requested, not invented here).

### 9.1 Open decision: data-fetching strategy

1. **Plain `useEffect` + `useState`** (no new dependency). Matches M4's "keep the SDK minimal, no retry/caching" philosophy carried up into the desktop app layer — consistent, no new library to justify for a single list+create screen.
2. **TanStack Query (React Query).** Handles loading/error/refetch/cache invalidation idiomatically, and is the de facto standard the moment a second data-driven screen exists — but is a real new dependency, and M4 explicitly rejected retry/caching machinery in the SDK itself on minimalism grounds.

**Recommendation: Option 1 (plain `useEffect`/`useState`) for M7.** One screen, one query, one mutation — React Query's value proposition (cache sharing across screens, background refetch, dedup) has no screen to share a cache with yet. Revisiting this at M8 or M11 (once there are genuinely 2+ data-driven screens across desktop *and* web) is the right time to introduce a shared data-fetching library, and it would likely live in a new pattern shared by both apps rather than being decided unilaterally inside `apps/desktop` alone. **Flagged for approval** since "no React Query in M7" is a real scope-limiting decision, not just an implementation detail.

## 10. API SDK Integration Points

- `src/lib/api-client.ts` (new, desktop-owned, not part of `packages/api-sdk` itself): the one place `createHttpClient()` + `createStudiosApi()` are instantiated, reading the base URL from Vite's env convention:

  ```ts
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
  ```

  This is new: `packages/api-sdk` explicitly documents in its own source that it never reads env itself (§1) — resolving `VITE_API_BASE_URL` is genuinely this milestone's responsibility, the first time that resolution is written anywhere in the repo.
- `apps/desktop/.env.example` (new) documenting `VITE_API_BASE_URL=http://localhost:4000`, mirroring the convention already established in `infra/env/.env.example`'s `API_BASE_URL` (Vite requires the `VITE_` prefix to expose a variable to client code — a real, necessary deviation from the root `.env.example`'s unprefixed name, not a naming inconsistency to "fix").
- No `getAuthHeaders` implementation yet (`ApiClientConfig.getAuthHeaders` stays `undefined` — explicitly reserved for M10 per the SDK's own doc comment).
- No `fetch` override needed (`ApiClientConfig.fetch` stays default) — Tauri's webview provides a real global `fetch` capable of plain HTTP calls to `localhost` without special Tauri IPC plumbing, consistent with ADR 0001's "calls `apps/api` over HTTP... like `apps/web`" framing. This is treated as a working assumption to be confirmed the moment `pnpm tauri dev` actually runs against a live `apps/api` (§13), not asserted as already proven.
- `studiosApi.listStudios()`/`createStudio()` are called **only from `StudiosPage.tsx`** (§9) — never from `AppShell`/`Sidebar`/`Header`, keeping data-fetching scoped to the one screen that needs it, and never from inside `packages/ui` itself (unchanged from M6's presentational-only rule).

## 11. Folder Structure

Building directly inside the already-scaffolded `apps/desktop/` (no new top-level app folder), following the Vite/Tauri convention:

```
apps/desktop/
  index.html                          # new — Vite entry HTML
  vite.config.ts                      # new — React + Tailwind v4 (@tailwindcss/vite) plugins
  package.json                        # modified — real deps (§12)
  tsconfig.json                       # unchanged (already correct — verified §1)
  tsconfig.node.json                  # new — Vite config's own tsconfig (standard Vite template output)
  .env.example                        # new — VITE_API_BASE_URL
  .gitignore                          # modified if needed — dist/, .vite/ (root .gitignore likely already covers these; verified, not assumed, at implementation time)
  README.md                           # modified — status: implemented

  src/
    main.tsx                          # new — React root, mounts <App />
    App.tsx                           # new — router provider (createHashRouter) + global providers, if any
    styles/
      globals.css                     # new — @import "@st-manager/config-tailwind/preset.css"; @source directives for packages/ui
    app/
      shell/
        AppShell.tsx                  # new — §4
        Header.tsx                    # new — §5
        Sidebar.tsx                   # new — §6
        nav-items.ts                  # new — §6
      studios/
        StudiosPage.tsx               # new — §9
    lib/
      api-client.ts                   # new — §10

  src-tauri/
    Cargo.toml                        # new — generated by tauri init/create-tauri-app
    tauri.conf.json                   # new — §3
    build.rs                          # new — generated, standard Tauri boilerplate
    src/
      main.rs                         # new — generated, standard Tauri boilerplate (no custom Rust commands in M7 — ADR 0001 keeps the Rust side a pure shell for now)
    capabilities/
      default.json                    # new — generated default capability set; reviewed (not blindly accepted) to confirm it permits the `http` plugin/fetch scope needed for localhost API calls
    icons/
      (generated default icon set)    # new — Tauri's placeholder icons; a real app icon is a design asset out of scope for this milestone, same reasoning as §5's logo
```

Existing `.gitkeep` placeholders in `src/components/`, `src/hooks/`, `src/lib/` are superseded/removed the same way M6 removed them from `packages/theme`/`packages/ui` once real files land in those directories (`src/components/` folded into `src/app/` above, matching feature-folder-by-screen rather than a flat `components/` bucket — since `packages/ui` already owns the *shared* component library, `apps/desktop/src` only needs app-specific composition, which reads better organized by screen/shell than by generic "components").

## 12. Dependencies Required and Justification

All additions scoped to `apps/desktop` only. No change to any `packages/*` or root `package.json` in this milestone (the shared foundation — `packages/ui`, `packages/theme`, `packages/config-tailwind`, `packages/api-sdk` — is already complete from M4/M6; M7 only *consumes* it).

| Dependency | Type | Why |
|---|---|---|
| `react`, `react-dom` | `dependencies` | Satisfies `packages/ui`'s peer dependency requirement; the actual React runtime for the app. |
| `@st-manager/ui`, `@st-manager/theme`, `@st-manager/api-sdk`, `@st-manager/contracts`, `@st-manager/types`, `@st-manager/constants`, `@st-manager/validation` | `dependencies` (workspace) | The shared foundation this milestone wires together; `contracts`/`types`/`constants`/`validation` are transitive needs of consuming `api-sdk`'s typed methods directly (e.g. `ListStudiosQueryDto`). |
| `@st-manager/config-tailwind` | `devDependencies` (workspace) | `globals.css`'s `@import` source. |
| `react-router` | `dependencies` | Routing (§8) — new to the repo, real decision flagged for approval. |
| `vite`, `@vitejs/plugin-react` | `devDependencies` | Standard Vite + React toolchain (matches `packages/ui`'s Vite-smoke-test precedent from M6, now a permanent app dependency instead of a throwaway). |
| `@tailwindcss/vite` | `devDependencies` | Tailwind v4's recommended Vite integration (chosen over PostCSS per M6 §4's own plan for desktop specifically). |
| `@tauri-apps/cli` | `devDependencies` | Per-project Tauri CLI (the global `tauri-cli` 2.11.4 confirmed installed in §1 is the dev-machine tool; the project itself should still pin its own CLI version in `package.json` for reproducibility across machines/CI, standard Tauri project convention). |
| `@tauri-apps/api` | `dependencies` | Tauri 2's JS-side API bindings (window controls, if/when needed — not calling any command in M7 beyond what the template wires by default). |
| `lucide-react` | already a `packages/ui` dependency, re-declared directly if the sidebar imports icons itself rather than only via `packages/ui`-exported icons (implementation-time detail; `packages/ui` doesn't currently re-export icons, so a direct dependency is the likely outcome) | Sidebar nav icons (§6). |
| `@types/react`, `@types/react-dom` | `devDependencies` | Already the pattern from `packages/ui`; needed again here since `apps/desktop` is its own compilation unit. |

No dependency touches `apps/api`, `apps/web`, or any `packages/*` implementation.

## 13. Validation Strategy

1. `pnpm install` — confirm workspace resolution succeeds after `apps/desktop/package.json` gains real dependencies.
2. `pnpm --filter @st-manager/desktop typecheck` — isolated typecheck (existing `tsconfig.json` extension expected to already be correct per §1; confirmed, not just assumed).
3. `pnpm lint` — confirm the M6-added `@st-manager/config-eslint/react` preset (currently scoped only to `packages/ui/**`) is extended to also cover `apps/desktop/**/*.{ts,tsx}` (a real, scoped `eslint.config.mjs` change this milestone does need to make — called out explicitly since M6's own report left that glob for "M7/M8 to add").
4. `pnpm --filter @st-manager/desktop build` (Vite production build of the frontend only) — confirms the frontend bundles without needing a full Tauri build.
5. **Live end-to-end run** (the actual roadmap Definition of Done): in one terminal, `pnpm --filter @st-manager/api dev` (real API against SQLite dev DB); in another, `pnpm --filter @st-manager/desktop tauri dev`. Confirm:
   - A native window opens showing the shell (header + sidebar + Studios screen).
   - The Studios list loads real rows from the dev database (or an empty state if none exist yet — `StudioList`'s empty-state handling, already built in M6, gets its first real exercise).
   - Submitting `StudioForm` creates a real row (`curl`-verifiable against the same dev DB independently, as an extra cross-check beyond just trusting the UI).
   - The newly created studio appears in the list without a manual app restart.
6. Root `pnpm build`/`pnpm typecheck` re-run in full to confirm no regression to M0–M6 packages.
7. Screenshot(s) of the running native window (light mode; dark mode only if a toggle is added — not planned for M7 per §5/§9 scope) captured as evidence for the implementation report, same pattern as M6's smoke-test screenshots.

## 14. Risks

1. **`create-tauri-app`/`cargo tauri init` non-interactivity**, same class of risk as M6's shadcn CLI (§ M6 planning report). Mitigation: use documented non-interactive flags; fall back to hand-authoring `tauri.conf.json`/`Cargo.toml`/`main.rs` from a known-good Tauri 2 + Vite + React template if the generator can't run cleanly in this environment.
2. **Tailwind v4 in a real Tauri webview**, flagged as a *paper* risk in M6's planning report (§12.1 there) — M7 is exactly the milestone where that assumption gets tested for real, on whatever OS/webview engine this environment provides. If `color-mix()`/cascade-layer support is insufficient, the fallback is Tailwind v3 for `apps/desktop` specifically (not a full repo-wide downgrade), documented as a contingency, not expected to be needed.
3. **Cross-package Tailwind `@source` detection**, the other paper risk carried over from M6 (§12.2 there) — `globals.css` must explicitly `@source` the `packages/ui` glob or its utility classes get purged in the Vite build. First real test of this exact monorepo Tailwind v4 setup.
4. **`react-router`'s hash-routing choice (§8) is a real new architectural surface for `apps/desktop`** that `apps/web`'s M8 Next.js routing will *not* share (Next has its own file-based router) — a deliberate, scoped-to-desktop decision, not a repo-wide routing standard, called out so it isn't mistaken for one later.
5. **No local database means the app is non-functional without `apps/api` running**, by design (ADR 0001) — worth restating here since it's the single biggest visible limitation of the "first running desktop app" milestone, and needs to be clearly labeled as *intentional and deferred to M11* in the implementation report, not a bug.
6. **Window-chrome decision (§3.1) and data-fetching decision (§9.1) are both "ship the simpler option now" calls** that could be revisited sooner than expected if a stakeholder wants a more polished/production-feel demo earlier than M8. Both are flagged explicitly for approval rather than silently decided, precisely so that risk is visible now rather than discovered after implementation.
7. **`apps/desktop/node_modules/.bin` already contains stray `tsc`/`tsserver` symlinks** (artifact of the current root-level `pnpm install` against the scaffold-only `package.json`) — expected to resolve cleanly once real dependencies are added and `pnpm install` re-run, but worth a sanity check during implementation rather than assuming it's a non-issue.
8. **No product bible content exists** (§1) to validate the sidebar/nav-item choice against real future screens — the "extensible but not speculative" design in §6/§8 is this plan's mitigation, but if product documentation lands before implementation and describes a materially different information architecture (e.g. multi-tenant studio switching, a dashboard home distinct from the studio list), this plan's shell assumptions should be re-checked against it first.

## 15. Definition of Done

- `apps/desktop` is a real Tauri 2 + Vite + React app (no more `.gitkeep`-only scaffolding).
- `pnpm --filter @st-manager/desktop tauri dev`, run alongside a live `pnpm --filter @st-manager/api dev`, opens a native window with a persistent shell (top header + sidebar with one "Studios" nav item) and a `/studios` route.
- The Studios screen lists real studios from the dev database and can create a new one via `StudioForm`, both through `packages/api-sdk`, with the new studio visible in the list without an app restart.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` all pass repository-wide with zero new errors.
- No file inside `apps/api`, `apps/web`, or any `packages/*` is modified except `eslint.config.mjs` (extending the existing React preset glob to `apps/desktop`, §13.3) — this milestone is strictly the desktop shell + wiring.
- `docs/meeting-notes/M7-implementation-report.md` written at implementation time (executive summary, files created/modified, dependencies added, validation results including the live end-to-end run and screenshot, risks, next milestone), matching the format of M2–M6's reports.

---

**Open decisions requiring explicit approval before implementation** (summarized from §3.1, §8, §9.1 so they can be answered in one pass):

1. **Window chrome:** native OS decorations (recommended) vs. a custom/frameless title bar with the top header doubling as window drag region + controls.
2. **Routing library:** `react-router` v7 in declarative/client-only mode using `createHashRouter` (recommended) vs. a minimal hand-rolled route registry with no new dependency.
3. **Data-fetching strategy:** plain `useEffect`/`useState` calling `packages/api-sdk` directly (recommended, consistent with M4's minimal-SDK philosophy) vs. introducing TanStack Query now.

Stopping here per instructions — no source code, dependencies, scaffolding commands, or commits have been touched. Awaiting review and approval of this plan (and the three decisions above) before implementing M7.
