# M0 + M1 Implementation Report

- Date: 2026-07-02
- Milestones: M0 (Repository Hygiene & ADRs), M1 (Foundation Packages)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md)
- Status: Complete, awaiting review

## Executive Summary

M0 and M1 of the Phase 2 roadmap are implemented and verified. Two ADRs close the open architecture questions needed before later milestones (desktop data access strategy, authentication provider). The shared ESLint configuration is real and wired into the workspace lint pipeline. All four foundation packages (`types`, `constants`, `utils`, `validation`) have production-ready implementations centered on the `Studio` entity — the first shared domain model — including a build pipeline, typecheck, and lint coverage.

Per explicit scope constraints, no database, API, UI, authentication, or AI code was written, and the frozen v3 architecture was not modified — only the previously-scaffolded config stubs were filled in with real implementations.

This report also documents a follow-up refinement made during review: the initial `packages/utils` implementation included a generic `formatIsoDate` helper with no other content. Per instruction to prefer Studio-specific shared utilities over generic demo utilities, `packages/utils` was revised so its primary public surface is Studio-specific (`slugifyStudioName`, `getStudioInitials`, `formatStudioCreatedAt`), with `formatIsoDate` retained only as an internal supporting helper composed by `formatStudioCreatedAt`.

## Packages Created

No new packages were created (all 16 packages already existed as scaffolding from the frozen architecture). Four were promoted from scaffold to implemented status:

| Package | Status before | Status after |
|---|---|---|
| `@st-manager/types` | Empty `src/.gitkeep` | `Studio` domain type, built and typechecked |
| `@st-manager/constants` | Empty `src/.gitkeep` | `ROLES`, `ROUTES`, `PAGINATION`, built and typechecked |
| `@st-manager/utils` | Empty `src/.gitkeep` | Studio-specific helpers (`slugifyStudioName`, `getStudioInitials`, `formatStudioCreatedAt`) plus internal `formatIsoDate`, built and typechecked |
| `@st-manager/validation` | Empty `src/studio/.gitkeep` | `createStudioSchema` (Zod), built and typechecked |
| `@st-manager/config-eslint` | Placeholder package.json only | Real flat-config presets (`base.mjs`, `react.mjs`, `nestjs.mjs`) |

## Files Changed

### Commit 1 — `049c142` (M0 + M1 initial implementation)

**Architecture Decision Records**
- `docs/system-architecture/adr/0001-desktop-local-data-access-strategy.md` (new)
- `docs/system-architecture/adr/0002-authentication-provider.md` (new)
- `docs/system-architecture/adr/.gitkeep` (removed, superseded by real content)

**Shared ESLint configuration**
- `packages/config-eslint/package.json` (real dependencies, `exports` map)
- `packages/config-eslint/base.mjs`, `react.mjs`, `nestjs.mjs` (new)
- `packages/config-eslint/README.md` (updated usage docs)
- `eslint.config.mjs` (new, root-level lint entry point)
- `package.json` (root: `lint` script changed to `eslint .`, added `eslint` + `@st-manager/config-eslint` devDependencies)

**Foundation packages**
- `packages/types/src/{studio.ts,index.ts}` (new), `package.json`, `README.md`
- `packages/constants/src/{roles.ts,routes.ts,limits.ts,index.ts}` (new), `package.json`, `README.md`
- `packages/utils/src/{date.ts,index.ts}` (new), `package.json`, `README.md`
- `packages/validation/src/{studio/studio.schema.ts,index.ts}` (new), `package.json`, `README.md`

**Shared build configuration (repository-wide hygiene fix)**
- All 16 `tsconfig.json` files (3 apps + 13 packages): added `rootDir: "./src"` to fix a real defect where `tsc` was leaking compiled `.js`/`.d.ts` output into `src/` alongside source files.
- `docs/roadmap/milestones.md` (new — original roadmap draft; later saved by the user as `docs/roadmap/phase2-roadmap.md`, which is the canonical version referenced by this report).
- `pnpm-lock.yaml` (new)

### Commit 2 — pending (this session's Studio-specific utilities refinement)

- `packages/utils/src/date.ts` — comment updated to clarify its role as an internal helper
- `packages/utils/src/studio.ts` (new) — `slugifyStudioName`, `getStudioInitials`, `formatStudioCreatedAt`
- `packages/utils/src/index.ts` — exports updated to surface the Studio-specific helpers
- `packages/utils/package.json` — added `@st-manager/types` as a workspace dependency
- `packages/utils/README.md` — status updated to reflect Studio-specific focus
- `docs/roadmap/phase2-roadmap.md` (new — canonical copy of the roadmap, saved per prior instruction)
- `docs/meeting-notes/M0-M1-implementation-report.md` (this report)
- `pnpm-lock.yaml` (updated for the new workspace dependency edge)

## Commands Executed

```bash
pnpm install
pnpm build
pnpm --filter @st-manager/types --filter @st-manager/constants \
     --filter @st-manager/utils --filter @st-manager/validation typecheck
pnpm lint
```

Additionally, after adding the `@st-manager/types` workspace dependency to `packages/utils`, all four foundation packages' `dist/` directories were removed and rebuilt from a clean state to confirm no stale or misplaced output remained (a precaution following the `rootDir` defect found and fixed in Commit 1).

## Validation Results

| Command | Result |
|---|---|
| `pnpm install` | Pass — resolves cleanly, workspace symlink for `@st-manager/types` confirmed inside `packages/utils/node_modules/@st-manager/` |
| `pnpm build` | Pass — 4/4 foundation packages build (`types`, `constants`, `utils`, `validation`); remaining 15 apps/packages correctly skipped (no `build` script yet, by design — no source exists for them) |
| `pnpm typecheck` (foundation packages) | Pass — `types`, `constants`, `utils`, `validation` all typecheck cleanly |
| `pnpm lint` | Pass — no errors or warnings across the repository |
| `src/` cleanliness check | Pass — verified no compiled `.js`/`.d.ts` artifacts leaked into any `src/` directory after the clean rebuild |

No errors were found that required fixing during this session's work. (Commit 1 did require and receive a fix during its own implementation: the `rootDir` defect described above, resolved before that commit was made.)

## Risks

- **Workspace dependency direction**: `packages/utils` now depends on `packages/types` (`workspace:*`). This is the first inter-package dependency in the monorepo; future foundation packages should follow the same `workspace:*` pattern rather than duplicating types, but reviewers should watch for circular dependencies as more packages gain cross-references (e.g. if `types` ever needed something from `utils`).
- **Prisma dual-provider strategy is still open**: ADR 0001 recommends deferring the desktop local-data decision to M11, but does not resolve how `packages/database` will support both SQLite and PostgreSQL schemas simultaneously (M2 will need to make this concrete).
- **Auth remains fully deferred**: `packages/contracts/src/auth/` and `packages/validation/src/auth/` are still empty per ADR 0002. This is intentional, but any milestone work that touches those folders before M10 should be flagged for review.
- **No automated CI yet**: all validation in this report was run locally. Until M13 lands, there is no enforcement preventing a future change from silently breaking `pnpm build`/`typecheck`/`lint` on `main`.
- **ESLint dependency surface**: `packages/config-eslint` now pulls in `eslint`, `typescript-eslint`, `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`. The React-specific plugins are unused until `apps/web`/`apps/desktop`/`packages/ui` have real source (M6+); low risk, but worth noting as unused surface area today.

## Git Commit

- **Commit 1:** `049c142` — `feat: implement Phase 2 M0+M1 foundation` (62 files changed, 2058 insertions, 56 deletions)
- **Commit 2:** `refactor: make packages/utils Studio-specific, add M0+M1 implementation report` (8 files changed, 393 insertions, 2 deletions). This report is part of that commit, so its own hash cannot be recorded inside itself without changing on write — run `git log --oneline -2` to see it (it is the current `HEAD` on `main` immediately following `049c142`).

## Next Recommended Milestone

**M2 — Database Layer Bootstrap.** Per the roadmap's critical path (`M0 → M1 → M2 → M3 → M4 → M5 → M7`), M2 is the next unblocked milestone: initialize Prisma in `packages/database`, define the minimal `Studio` model, resolve the dual-provider (SQLite/PostgreSQL) schema strategy left open by ADR 0001, and generate a working Prisma Client. M2 has no dependency on anything not already complete (M0 and M1 are both done).
