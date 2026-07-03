# M13 Planning Report — CI/CD and Hardening

- Date: 2026-07-03
- Milestone: M13 (CI/CD and Hardening)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md), [docs/roadmap/milestones.md](../roadmap/milestones.md), M0–M12 planning and implementation reports
- Status: **Planning only — no application code, dependencies, scaffolding commands, or commits have been generated.** Awaiting approval before implementation.

**Note on source documents:** `roadmap/milestones/M13.md` does not exist in this repository. M13 scope is taken verbatim from `docs/roadmap/phase2-roadmap.md` §M13 and the duplicate entry in `docs/roadmap/milestones.md`.

## 1. Current Repository State

Repository history after M12 (`304f730`):

```
526a818 refactor: make packages/utils Studio-specific, add M0+M1 implementation report
c48f8ba feat(database): implement Prisma 7 database layer                    (M2)
5a337c2 feat(api): bootstrap NestJS API with health endpoint                  (M3)
e4ec488 feat(contracts,sdk): add Studio API contracts and SDK thread          (M4)
5e9e616 feat(api): implement Studio CRUD feature module                       (M5)
957abcd feat(ui): implement theme tokens, Tailwind v4 preset, and shared UI primitives (M6)
c22bc85 feat(desktop): bootstrap Tauri 2 shell with Studio list/create        (M7)
87a9f7d feat(web): bootstrap Next.js portal with Studio list/create           (M8)
de825df feat(logging,storage): wire structured logging and local storage adapter (M9)
e73aaee feat(auth): implement custom JWT authentication and protect Studio create (M10)
e6aab48 feat(sync): implement embedded SQLite and background sync (M11)
304f730 feat(ai): implement studio summary generation (M12)
```

What exists and is real going into M13:

- **CI/CD:** **None.** No `.github/workflows/` directory. No GitHub Actions. No branch-protection configuration in-repo (GitHub repo settings are out of band).
- **Test runner:** **None.** No `test` script at root or in any workspace `package.json`. No Vitest, Jest, or `@nestjs/testing` dependency. Every milestone since M2 has deferred automated tests to M13.
- **Root scripts (`package.json`):** `build`, `dev`, `lint`, `typecheck`, `clean` only — no `test`.
- **Turbo (`turbo.json`):** `build`, `dev`, `lint`, `typecheck`, `clean` tasks — no `test` task.
- **Manual regression scripts (`apps/api/scripts/`):**
  - `auth-smoke.sh` (M10) — login, protected create, refresh, public list.
  - `sync-smoke.sh` (M11) — auth guard, push create, idempotent retry, pull.
  - `ai-smoke.sh` (M12) — auth guard, mock AI summary.
  - All are bash + `curl` + inline `node -e` assertions; require a **running API** on port 4000.
- **Dev database seed:** `packages/database/scripts/seed-dev-user.ts` upserts `dev@st-manager.local` / `devpassword` — required by smoke scripts but **not wired into any automated pipeline**.
- **Validation that already works locally (M12 report):**
  - `pnpm lint` — pass (root ESLint flat config via `@st-manager/config-eslint`).
  - `pnpm typecheck` — pass (16 packages with `typecheck` scripts; config-only packages excluded).
  - `pnpm build` — pass (15 build tasks including `@st-manager/ai`, `@st-manager/api`, desktop Vite, web Next.js).
- **Known hardening gaps (documented in prior reports):**
  - `sync-smoke.sh` **environmental flake** — fixed smoke studio ID may already exist in dev SQLite, causing first push to return `unchanged` instead of expected `created` (M12 implementation report §10).
  - **No PostgreSQL in local/CI verification** — API dev/test uses SQLite; production Postgres path validated only at boot-failure level (M5 report).
  - **Desktop Tauri native build** — Rust + system WebKit deps; not exercised in any automated check today.
  - **Root `pnpm typecheck`** historically failed on empty scaffold packages; M9–M12 filled most scaffolds. `packages/config-{eslint,tailwind,typescript}` remain config-only (no typecheck script — acceptable).

What is pure scaffolding / missing today (M13 targets):

```
.github/workflows/              (does not exist)
**/vitest.config.*               (does not exist)
**/*.spec.ts / **/*.test.ts      (does not exist)
root package.json "test" script  (does not exist)
turbo.json "test" task           (does not exist)
```

**Phase 2 closure note:** The roadmap positions M13 as the milestone with **exit criteria before Phase 2 is declared complete**. M13 is the final planned Phase 2 milestone in `phase2-roadmap.md`.

## 2. M13 Goal (from the Roadmap, Verbatim Scope)

> **Goal:** make the above sustainable, not a one-off.
>
> - GitHub Actions: lint, typecheck, test, build on PR (`.github/workflows/ci.yml`).
> - Unit tests for the Studio feature across `apps/api` and `packages/*`.
> - Tauri release workflow (build signing deferred until a release is actually needed).
>
> **Depends on:** ongoing from M3 onward; formalized as its own milestone with exit criteria before Phase 2 is declared complete.

**Scope interpretation (strict):**

- **In scope:** GitHub Actions CI workflow on PR/push; root + package `test` scripts; Vitest (or equivalent) unit tests centered on the **Studio feature** in `apps/api` and relevant `packages/*`; wire existing smoke scripts into CI as **integration regression** checks; fix known smoke-script flake; Tauri **build** workflow without code signing; document CI env requirements; M13 implementation + commit summary reports.
- **Out of scope:** Code signing / notarization / app-store release; Playwright/Cypress full UI e2e; PostgreSQL service container (unless explicitly chosen in open decision #4); production deployment pipeline; Sentry/Datadog; RBAC expansion; new product features; Phase 3 planning.

M13 **requires workflow files, test infrastructure, and targeted test implementations**. It should **not** rewrite feature code except where needed to make code testable or fix smoke-script determinism.

## 3. CI Architecture — Recommended Design

### 3.1 Workflow file

| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | Primary PR/push pipeline (roadmap-mandated path) |

Optional second workflow (roadmap §Tauri release):

| File | Purpose |
|---|---|
| `.github/workflows/release-desktop.yml` | Build Tauri artifacts on tag/manual dispatch; **no signing** |

Planning **recommends both files** — `ci.yml` is required by roadmap wording; `release-desktop.yml` satisfies the Tauri release workflow bullet with signing explicitly deferred.

### 3.2 Triggers

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

### 3.3 CI jobs (recommended layout)

| Job | Runs | Rationale |
|---|---|---|
| **`quality`** | `pnpm install` → `pnpm lint` → `pnpm typecheck` → `pnpm build` | Roadmap: lint, typecheck, build on PR. Single job keeps pnpm store + turbo cache simple. |
| **`test`** | `pnpm test` (unit tests via Turbo) | Roadmap: test on PR. Isolated from integration for faster feedback. |
| **`api-integration`** | SQLite migrate + seed → start API → smoke scripts | Hardening: promotes M10–M12 bash scripts to CI regression. Uses `AI_PROVIDER=mock`. |
| **`desktop-build`** (optional / parallel) | `pnpm --filter @st-manager/desktop tauri build` | Roadmap Tauri release workflow (unsigned). Heavy — run in separate job with Rust + Linux WebKit deps. |

Planning **recommends** jobs `quality`, `test`, and `api-integration` as **required** for M13 DoD. Job `desktop-build` is **recommended** but may be marked `continue-on-error: true` initially if WebKit setup proves flaky — see open decision #3.

### 3.4 Runner and toolchain

| Setting | Recommendation |
|---|---|
| Runner | `ubuntu-latest` |
| Node | 20.x (matches local dev `Node.js v20.20.2`) |
| pnpm | 9.x via `pnpm/action-setup` with `packageManager: pnpm@9.0.0` from root `package.json` |
| Turbo cache | `actions/cache` on `.turbo` (optional M13 enhancement) |
| Rust (desktop job only) | `dtolnay/rust-toolchain@stable` + Tauri Linux system deps (`libwebkit2gtk-4.1-dev`, etc.) |

### 3.5 CI environment variables

| Variable | CI value | Notes |
|---|---|---|
| `NODE_ENV` | `development` or `test` | Keeps SQLite path required by `apiEnvSchema` |
| `SQLITE_URL` | `file:./packages/database/prisma/sqlite/ci.db` | Isolated DB file per run |
| `AUTH_SECRET` | fixed 32+ char test secret | Required for JWT |
| `AI_PROVIDER` | `mock` | No `AI_API_KEY` in CI |
| `API_PORT` | `4000` | Matches smoke scripts default |

Steps before API boot in integration job:

```bash
pnpm --filter @st-manager/database exec prisma migrate deploy --config prisma.config.sqlite.ts
pnpm --filter @st-manager/database run db:seed:dev
pnpm --filter @st-manager/api build
AI_PROVIDER=mock node apps/api/dist/main.js &   # or `pnpm --filter @st-manager/api start:prod`
bash apps/api/scripts/auth-smoke.sh
bash apps/api/scripts/sync-smoke.sh
bash apps/api/scripts/ai-smoke.sh
```

## 4. Test Framework Decision

No test runner exists. Prior milestones (M2–M12) consistently deferred to M13.

| Option | M13 recommendation | Rationale |
|---|---|---|
| **Vitest** | **Recommended** | Fast; native ESM/CJS; works in packages + Nest; single config pattern across monorepo; modern default for Vite/Turbo repos. |
| **Jest** | Not recommended for M13 | Nest docs default to Jest, but adding Jest + Vitest doubles tooling; Vitest covers Nest unit tests adequately. |
| **Node built-in test runner** | Not recommended | Too minimal for React component tests if added later. |

**Deliverable:** root `vitest.config.ts` (or shared `packages/config-vitest` — **not recommended for M13**; keep one root config to minimize scope) + per-package test entry points discovered by Turbo.

Add to root `package.json`:

```json
"test": "turbo run test"
```

Add to `turbo.json`:

```json
"test": {
  "dependsOn": ["^build"],
  "outputs": ["coverage/**"]
}
```

## 5. Unit Test Scope — Studio Feature (Roadmap Wording)

Roadmap: *"Unit tests for the Studio feature across `apps/api` and `packages/*`."*

Planning interprets **Studio feature** as the original vertical slice (M1–M5) **plus** shared validation/utils that Studio CRUD depends on. Auth, sync, and AI receive **integration coverage via smoke scripts**, not full unit suites in M13 (unless trivial to add).

### 5.1 Recommended unit test matrix

| Package / app | Test target | Example assertions |
|---|---|---|
| `packages/validation` | `createStudioSchema`, `listStudiosQuerySchema` | rejects empty name; applies pagination defaults |
| `packages/utils` | `slugifyStudioName`, `getStudioInitials`, `formatStudioCreatedAt` | deterministic string outputs |
| `packages/constants` | `PAGINATION` defaults used by list schema | bounds match validation |
| `packages/api-sdk` | `createHttpClient` + `createStudiosApi` with mocked `fetch` | unwraps `{ success, data }`; throws `ApiError` on 400 |
| `apps/api` | `StudiosService` | mocked `StudiosRepository`; pagination math |
| `apps/api` | `ZodValidationPipe` | maps Zod failure to structured 400 body |
| `apps/api` | `StudiosController` (optional) | `@nestjs/testing` module with mocked service |

**Lower priority (nice-to-have if time permits, not DoD blockers):**

| Package | Test target |
|---|---|
| `packages/ai` | `createMockProvider`, `runStudioSummaryPipeline` with mock |
| `packages/ui` | `StudioForm` render + submit callback (jsdom) |

**Explicitly out of M13 unit scope:** Tauri Rust commands, desktop sync engine, Next.js page components, Prisma repository integration (covered by smoke scripts instead).

### 5.2 Test file layout

```
packages/validation/src/studio/studio.schema.test.ts
packages/utils/src/studio.test.ts
packages/api-sdk/src/studios/studios.api.test.ts
packages/api-sdk/src/client/http-client.test.ts
apps/api/src/modules/studios/studios.service.spec.ts
apps/api/src/common/pipes/zod-validation.pipe.spec.ts
```

Use `.test.ts` in packages and `.spec.ts` in Nest app (Nest convention) — acceptable mixed convention.

## 6. Smoke Script Hardening

M12 documented `sync-smoke.sh` failure when the fixed studio ID already exists in dev SQLite.

**Recommended fix (M13 hardening):**

| Script | Change |
|---|---|
| `sync-smoke.sh` | Generate a **unique client ID per run** (`cuid` or `Date.now()` suffix) for the create step; keep idempotent retry against same ID in second push |
| All smoke scripts | Accept `API_BASE_URL` (already supported); CI sets explicitly |
| Optional | Add `apps/api/scripts/ci-smoke.sh` wrapper that runs all three in sequence |

This is **in scope** as hardening — not a feature change.

## 7. Tauri Release Workflow (Signing Deferred)

Roadmap: *"Tauri release workflow (build signing deferred until a release is actually needed)."*

### 7.1 Recommended `release-desktop.yml`

| Aspect | M13 choice |
|---|---|
| Trigger | `workflow_dispatch` + optional `push: tags: ['desktop-v*']` |
| Build | `pnpm install` → `pnpm --filter @st-manager/desktop tauri build` |
| Signing | **None** — no Apple/Google credentials |
| Artifacts | Upload `apps/desktop/src-tauri/target/release/bundle/**` as GitHub Actions artifacts |
| Platforms | **Linux only in M13** (single runner); macOS/Windows matrix deferred |

**Rationale:** proves release path exists; avoids certificate management; matches "deferred until needed."

## 8. Folder Structure Summary

**New:**

```
.github/workflows/ci.yml
.github/workflows/release-desktop.yml          (recommended)
vitest.config.ts                             (root shared config)
packages/validation/src/studio/studio.schema.test.ts
packages/utils/src/studio.test.ts
packages/api-sdk/src/client/http-client.test.ts
packages/api-sdk/src/studios/studios.api.test.ts
apps/api/src/modules/studios/studios.service.spec.ts
apps/api/src/common/pipes/zod-validation.pipe.spec.ts
apps/api/scripts/ci-smoke.sh                 (optional wrapper)
docs/meeting-notes/M13-implementation-report.md   (at implementation time)
docs/meeting-notes/M13-commit-summary.md          (at implementation time)
```

**Modified:**

- `package.json` (root) — `"test": "turbo run test"`.
- `turbo.json` — `test` task.
- `apps/api/package.json`, `packages/validation/package.json`, `packages/utils/package.json`, `packages/api-sdk/package.json` — `test` script + vitest devDependency.
- `apps/api/scripts/sync-smoke.sh` — deterministic unique ID (hardening).
- `pnpm-lock.yaml`.
- Optional: `README.md` at root or `docs/` — CI badge + contributor test instructions.

**Explicitly not modified:** Prisma schemas; feature modules beyond testability hooks; `packages/ui` props; product features.

## 9. Dependencies Required and Justification

| Package | Dependency | Type | Why |
|---|---|---|---|
| root (or each test package) | `vitest` | devDependency | Unit test runner |
| `apps/api` | `vitest`, `@nestjs/testing` | devDependency | Nest service/pipe unit tests |
| `packages/api-sdk` | `vitest` | devDependency | Mocked fetch tests |
| test packages | `@vitest/coverage-v8` | devDependency (optional) | Coverage reporting in CI — optional for M13 DoD |

No new production runtime dependencies.

## 10. Risks

1. **Tauri CI fragility** — Linux WebKit/system deps vary; desktop-build job may need iteration.
2. **Prisma migrate in CI** — `SQLITE_URL` path must exist; migrate deploy must be non-interactive (M2 noted this for CI).
3. **API integration job timing** — server boot race; use `curl` retry loop or `wait-on` before smoke scripts.
4. **Turbo + Vitest** — packages must declare `"test": "vitest run"`; missing script excludes package from `turbo run test` (fine for apps without unit tests).
5. **Nest + Vitest** — minor config needed for `reflect-metadata` / path aliases; solvable in `vitest.config.ts`.
6. **pnpm install in CI** — M2 documented occasional interactive prompts; CI must use `--frozen-lockfile`.
7. **Scope creep** — roadmap says "Studio feature" but M0–M12 added auth/sync/AI; resist full-suite unit tests in M13; use smoke scripts for those threads.
8. **GitHub secrets** — none required for M13 (mock AI, SQLite, test JWT secret in workflow env).

## 11. Validation Strategy

1. `pnpm install` — after Vitest additions.
2. `pnpm test` (local) — all new unit tests pass.
3. `pnpm lint` — zero new errors/warnings.
4. `pnpm typecheck` — no regression.
5. `pnpm build` — no regression.
6. **Local integration rehearsal:**

   ```bash
   # Terminal 1
   AI_PROVIDER=mock pnpm --filter @st-manager/api dev

   # Terminal 2
   bash apps/api/scripts/auth-smoke.sh
   bash apps/api/scripts/sync-smoke.sh   # after hardening fix
   bash apps/api/scripts/ai-smoke.sh
   ```

7. **CI dry run** — push branch or `act` (optional); verify `ci.yml` green on GitHub.
8. **Tauri release workflow** — manual `workflow_dispatch`; confirm unsigned artifact uploads.

## 12. Definition of Done

- [ ] `.github/workflows/ci.yml` runs lint, typecheck, test, and build on PR/push to `main`.
- [ ] Root `pnpm test` executes unit tests via Turbo.
- [ ] Unit tests exist for Studio feature in `apps/api` and relevant `packages/*` (validation, utils, api-sdk minimum).
- [ ] API smoke scripts (`auth`, `sync`, `ai`) run in CI integration job with `AI_PROVIDER=mock`.
- [ ] `sync-smoke.sh` hardened for deterministic pass on fresh + existing DB states.
- [ ] Tauri release workflow exists; build signing explicitly deferred.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` pass locally.
- [ ] `docs/meeting-notes/M13-implementation-report.md` written at implementation time.
- [ ] Nothing committed until implementation report is reviewed and approved.

## 13. Phase 2 Completion

Upon M13 approval and implementation, the Phase 2 roadmap milestones (M0–M13) are complete per `phase2-roadmap.md`. Post-M13 work (production Postgres verification, signed desktop releases, expanded test coverage, Phase 3 features) is **out of scope** until separately approved.

## 14. Next Recommended Work (Post-M13)

No M14 is defined in `phase2-roadmap.md`. Reasonable follow-ons (not planned here):

- Branch protection rules requiring `ci.yml` checks on `main`.
- PostgreSQL CI service + migration deploy verification.
- macOS/Windows Tauri build matrix + signing when a release is needed.
- Playwright smoke for web `/studios` UI.

---

**Open decisions requiring explicit approval before implementation** (summarized for one-pass review):

1. **Test runner:** **Vitest** (recommended) vs **Jest** (Nest default).

2. **CI job split:** **Three required jobs** (`quality`, `test`, `api-integration`) vs **single monolithic job** (simpler, slower feedback).

3. **Tauri in CI:** **Include `desktop-build` job** in M13 (recommended, unsigned Linux only) vs **defer entirely** to a later release milestone (minimal M13 — only `release-desktop.yml` on manual dispatch).

4. **Database in CI:** **SQLite file + migrate deploy + seed** (recommended) vs **add PostgreSQL service container** for production-path verification.

5. **Unit test breadth:** **Studio-focused minimum matrix** (§5.1 required rows only — recommended) vs **expanded coverage** including `packages/ai` unit tests and `packages/ui` component tests in M13.

6. **Smoke script strategy:** **Wire existing three scripts into CI** (recommended) vs **rewrite as Vitest/supertest integration tests** (more maintainable long-term, higher M13 effort).

7. **Coverage enforcement:** **No coverage thresholds in M13** (recommended) vs **fail CI below N% coverage**.

Stopping here per instructions — no source code, dependencies, scaffolding commands, or commits have been touched. Awaiting review and approval of this plan (and the seven decisions above) before implementing M13.
