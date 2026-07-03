# M13 Implementation Report — CI/CD and Hardening

- Status: Implemented, validated, **not committed** (awaiting review per instructions)
- Base: M12 (`304f730`), committed
- Date: 2026-07-03
- Scope: GitHub Actions CI, Vitest unit tests, smoke-script hardening, Tauri release workflow (unsigned), and this report. Phase 2 milestone closure. No commit or push.
- Source: [M13 planning report](./M13-planning-report.md) (approved as written, including all seven recommended open decisions)

## 1. Executive Summary

M13 delivers **sustainable validation** for the M0–M12 stack: a GitHub Actions pipeline (lint, typecheck, test, build, API integration smokes), Vitest unit tests for the Studio vertical slice, hardened bash smoke scripts, and an unsigned Tauri release workflow.

All seven open decisions from the planning report were applied as recommended:

1. **Test runner:** Vitest (monorepo-wide shared config).
2. **CI job split:** `quality`, `test`, and `api-integration` as required jobs.
3. **Tauri in CI:** `desktop-build` job in `ci.yml` with `continue-on-error: true`; separate `release-desktop.yml` for manual/tag builds.
4. **Database in CI:** SQLite `migrate deploy` + dev user seed (no PostgreSQL container).
5. **Unit test breadth:** Studio-focused minimum matrix (validation, utils, api-sdk, api service/pipe).
6. **Smoke strategy:** Existing bash scripts wired via new `ci-smoke.sh` wrapper.
7. **Coverage:** No thresholds enforced.

**Phase 2 (M0–M13) is now complete** per `docs/roadmap/phase2-roadmap.md`.

## 2. Files Created

**`.github/workflows/`**

- `ci.yml` — `quality`, `test`, `api-integration`, and `desktop-build` jobs.
- `release-desktop.yml` — unsigned Linux Tauri artifact build on `workflow_dispatch` / `desktop-v*` tags.

**Test infrastructure**

- `vitest.shared.ts` — shared Node environment defaults.
- `packages/validation/vitest.config.ts`
- `packages/utils/vitest.config.ts`
- `packages/api-sdk/vitest.config.ts`
- `apps/api/vitest.config.ts`, `vitest.setup.ts` (`reflect-metadata` for Nest pipes).

**Unit tests (21 tests total)**

- `packages/validation/src/studio/studio.schema.test.ts` — 7 tests (`createStudioSchema`, `listStudiosQuerySchema`, pagination bounds).
- `packages/utils/src/studio.test.ts` — 5 tests (slug, initials, date formatting).
- `packages/api-sdk/src/client/http-client.test.ts` — 3 tests (success, ApiError, network).
- `packages/api-sdk/src/studios/studios.api.test.ts` — 2 tests (create unwrap, list envelope).
- `apps/api/src/modules/studios/studios.service.spec.ts` — 2 tests (create, pagination).
- `apps/api/src/common/pipes/zod-validation.pipe.spec.ts` — 2 tests (success, structured 400).

**`apps/api/`**

- `scripts/ci-smoke.sh` — runs auth, sync, and AI smoke scripts in sequence.
- `tsconfig.build.json` — excludes `*.spec.ts` from Nest production build.

**`docs/`**

- `meeting-notes/M13-implementation-report.md` (this file).

## 3. Files Modified

- `package.json` (root) — `"test": "turbo run test"`.
- `turbo.json` — `test` task with `dependsOn: ["^build"]`.
- `apps/api/package.json` — `test` script; `vitest`, `@nestjs/testing` devDependencies.
- `apps/api/nest-cli.json` — build uses `tsconfig.build.json`.
- `apps/api/scripts/sync-smoke.sh` — unique studio ID per run (`cmr4syncsmoke` + timestamp base36).
- `packages/validation/package.json`, `packages/utils/package.json`, `packages/api-sdk/package.json` — `test` script + `vitest`.
- `pnpm-lock.yaml` — Vitest and related dependencies.

**Unchanged (as planned):** Prisma schemas; feature modules; `packages/ui`; product features; code signing.

## 4. Dependencies Added (Resolved Versions)

| Package | Dependency | Type | Resolved version |
|---|---|---|---|
| `packages/validation` | `vitest` | devDependency | 3.2.6 |
| `packages/utils` | `vitest` | devDependency | 3.2.6 |
| `packages/api-sdk` | `vitest` | devDependency | 3.2.6 |
| `apps/api` | `vitest` | devDependency | 3.2.6 |
| `apps/api` | `@nestjs/testing` | devDependency | 11.1.27 |

No new production runtime dependencies.

## 5. Approved Architectural Decisions Applied

| Decision (planning report §14) | Choice applied |
|---|---|
| Test runner | Vitest with shared root config |
| CI jobs | `quality` + `test` + `api-integration` (required) |
| Tauri | `desktop-build` in CI (`continue-on-error: true`); `release-desktop.yml` unsigned |
| CI database | SQLite migrate deploy + seed |
| Unit tests | Studio minimum matrix (§5.1 required rows) |
| Integration | Bash smoke scripts via `ci-smoke.sh` |
| Coverage | None enforced |

## 6. Deviations From Plan (Justified)

### 6.1 Nest build excludes spec files

**Plan assumption:** Vitest spec files live under `apps/api/src/`.

**Reality:** Nest `build` compiles all `src/` by default, which would emit spec files into `dist/`.

**Fix:** Added `tsconfig.build.json` excluding `**/*.spec.ts` and pointed `nest-cli.json` at it. `tsc --noEmit` (typecheck) still includes specs.

### 6.2 Turbo `test` task outputs

**Plan draft:** `"outputs": ["coverage/**"]`.

**Reality:** No coverage collection configured; Turbo warned about missing output artifacts.

**Fix:** Removed `outputs` from the `test` task (no coverage thresholds per decision #7).

## 7. Validation Results

| Check | Result |
|---|---|
| `pnpm install` | Pass |
| `pnpm test` | Pass — **21 tests** across 4 packages (validation 7, utils 5, api-sdk 5, api 4) |
| `pnpm lint` | Pass — 0 errors, 0 warnings |
| `pnpm typecheck` | Pass — 16 packages |
| `pnpm build` | Pass — 15 tasks |
| `bash apps/api/scripts/ci-smoke.sh` | Pass — auth + sync (hardened) + AI smokes |
| `bash apps/api/scripts/auth-smoke.sh` | Pass (via ci-smoke) |
| `bash apps/api/scripts/sync-smoke.sh` | Pass (via ci-smoke; unique ID fix verified) |
| `bash apps/api/scripts/ai-smoke.sh` | Pass (via ci-smoke) |

**Note:** Smoke tests ran against an already-running local API on port 4000 (`AI_PROVIDER=mock`). CI `api-integration` job starts its own API instance with isolated `SQLITE_URL=file:./prisma/sqlite/ci.db`.

## 8. CI Workflow Summary

### `ci.yml`

| Job | Steps |
|---|---|
| `quality` | `pnpm install --frozen-lockfile` → lint → typecheck → build |
| `test` | install → `pnpm test` |
| `api-integration` | build → SQLite migrate + seed → start API → `ci-smoke.sh` |
| `desktop-build` | Rust + WebKit deps → desktop Vite build → `tauri build` (`continue-on-error: true`) |

### `release-desktop.yml`

- Trigger: manual dispatch or `desktop-v*` tag push.
- Output: unsigned Linux bundle uploaded as GitHub Actions artifact.
- Signing: explicitly deferred.

## 9. Definition of Done (Roadmap)

- [x] `.github/workflows/ci.yml` runs lint, typecheck, test, and build on PR/push to `main`.
- [x] Root `pnpm test` executes unit tests via Turbo.
- [x] Unit tests for Studio feature in `apps/api` and `packages/*` (validation, utils, api-sdk).
- [x] API smoke scripts run in CI integration job design (`ci-smoke.sh` + env documented).
- [x] `sync-smoke.sh` hardened with per-run unique studio IDs.
- [x] Tauri release workflow exists; signing deferred.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` pass locally.
- [x] `docs/meeting-notes/M13-implementation-report.md` written.
- [x] Nothing committed until this report is reviewed and approved.

## 10. Known Limitations

1. **`desktop-build` CI job** — marked `continue-on-error: true`; may need iteration on Linux WebKit dependencies.
2. **No PostgreSQL CI path** — production datasource verified only at boot level (pre-existing).
3. **No UI e2e automation** — Playwright/Cypress deferred post-M13.
4. **No coverage thresholds** — tests prove regressions for Studio slice; coverage metrics not collected.
5. **GitHub Actions not dry-run locally** — workflows validated by structure review; first green run expected on push to GitHub.

## 11. Phase 2 Completion

M13 is the final milestone in `docs/roadmap/phase2-roadmap.md`. With this implementation, the Phase 2 walking skeleton (M0–M7 critical path) and outward features (M8–M12) are backed by automated lint/typecheck/test/build CI and API smoke regression.

Post-M13 work (branch protection, Postgres CI, signed releases, expanded coverage) requires separate approval.

---

M13 has not been committed. Work stops here pending review and approval. **No git commit. No push.**
