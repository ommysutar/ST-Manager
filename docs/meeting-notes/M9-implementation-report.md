# M9 Implementation Report — Logging and Storage Wiring

- Status: Implemented, validated, **not committed** (awaiting review per instructions)
- Base: M8 (`87a9f7d`), committed
- Date: 2026-07-03
- Scope: `packages/logging`, `packages/storage`, `apps/api` (logger wiring only), and this report. No changes to `apps/desktop`, `apps/web`, Studio routes, or any other `packages/*` implementation.
- Source: [M9 planning report](./M9-planning-report.md) (approved as written, including all five recommended open decisions)

## 1. Executive Summary

M9 implements the two cross-cutting scaffold packages deferred since M0: **`packages/logging`** (structured logger + JSON console transport) and **`packages/storage`** (local filesystem adapter). The NestJS API now emits **structured JSON logs** through a shared `@st-manager/logging` transport wired via Nest's `LoggerService` bridge — fulfilling the M5 deferral that kept `@nestjs/common`'s `Logger` in place until this milestone.

All five open decisions from the planning report were applied as recommended:

1. **Nest integration via `app.useLogger()`** — `StManagerNestLoggerService` implements `LoggerService`; existing `new Logger(context)` call sites unchanged.
2. **JSON always on stdout** — every log line is single-line JSON (including Nest bootstrap and `PrismaService` logs).
3. **Storage smoke via `tsx scripts/smoke.ts`** — matches `packages/theme` precedent.
4. **Smoke artifacts in `packages/storage/.data/`** — gitignored.
5. **Remote/S3 interface stubs only** — `RemoteLogTransportOptions` and `RemoteStorageAdapterOptions` exported as types; no network implementation.

Storage is proven functional via the smoke script only — **not wired into any API route or client feature**, per roadmap scope.

One implementation-time fix was required: **`packages/logging` and `packages/storage` compile to CommonJS** (matching M1 packages like `constants`) so NestJS can `require()` the built `dist/` output at runtime. The default `ESNext` module setting from `config-typescript/base.json` produced ESM `export` syntax that failed at API dev startup with `ERR_MODULE_NOT_FOUND`.

## 2. Files Created

**`packages/logging/`**

- `src/types.ts` — `LogLevel`, `LogRecord`, `Logger`, `LogTransport`, `RemoteLogTransportOptions` (stub).
- `src/logger.ts` — `createLogger()` with min-level filtering.
- `src/formatters/json.ts` — `formatJsonLogRecord()`.
- `src/transports/console.ts` — `createConsoleTransport()` writing JSON lines to stdout.
- `src/index.ts` — public exports.

**`packages/storage/`**

- `src/types/stored-object.ts` — `StoredObject`, `PutOptions`, `RemoteStorageAdapterOptions` (stub).
- `src/types/errors.ts` — `StorageError`, `StorageNotFoundError`.
- `src/adapters/storage-adapter.ts` — `StorageAdapter` interface.
- `src/adapters/local-filesystem.ts` — `createLocalFilesystemAdapter()` with key sanitization.
- `src/index.ts` — public exports.
- `scripts/smoke.ts` — put/get/delete exercise + traversal-key rejection test.
- `.gitignore` — ignores `.data/`.

**`apps/api/`**

- `src/common/logging/st-manager-nest-logger.service.ts` — Nest `LoggerService` adapter delegating to `@st-manager/logging`.

**`docs/`**

- `meeting-notes/M9-implementation-report.md` (this file).

## 3. Files Modified

- `packages/logging/package.json` — `build`, `main`, `types`; `@types/node` devDependency.
- `packages/logging/tsconfig.json` — CommonJS module output, Node types.
- `packages/logging/README.md` — status: implemented; JSON shape documented.
- `packages/storage/package.json` — `build`, `smoke`, `main`, `types`; `tsx` and `@types/node` devDependencies.
- `packages/storage/tsconfig.json` — CommonJS module output, Node types.
- `packages/storage/README.md` — status: implemented; smoke script documented.
- `apps/api/package.json` — `@st-manager/logging` workspace dependency.
- `apps/api/src/main.ts` — `bufferLogs: true`, `app.useLogger()`, bootstrap via injected logger.
- `apps/api/src/app.module.ts` — register `StManagerNestLoggerService` provider.
- `apps/api/src/common/filters/http-exception.filter.ts` — updated M9 logging comments (behavior unchanged).
- `pnpm-lock.yaml` — `@types/node` entries for logging/storage packages.
- Deleted superseded `.gitkeep` files in `packages/logging/src/{formatters,transports}/` and `packages/storage/src/{adapters,types}/`.

**Unchanged (as planned):** Studio modules, Prisma schema, `apps/desktop`, `apps/web`, `eslint.config.mjs`, contracts, api-sdk, ui.

## 4. Dependencies Added (Resolved Versions)

| Package | Dependency | Type | Resolved version |
|---|---|---|---|
| `packages/logging` | `@types/node` | devDependency | 22.15.3 |
| `packages/storage` | `@types/node` | devDependency | 22.15.3 |
| `packages/storage` | `tsx` | devDependency | 4.22.5 |
| `apps/api` | `@st-manager/logging` | dependency (workspace) | link |

No new third-party runtime dependencies. `@st-manager/storage` is **not** a dependency of `apps/api`.

## 5. Approved Architectural Decisions Applied

| Decision (planning report §12) | Choice applied |
|---|---|
| Nest integration | `StManagerNestLoggerService` + `app.useLogger()` |
| Log format | JSON always on stdout |
| Storage smoke runner | `pnpm --filter @st-manager/storage smoke` via `tsx` |
| Smoke artifact directory | `packages/storage/.data/smoke/` (gitignored) |
| Remote stubs | TypeScript interfaces only — no implementation |

## 6. Deviations From Plan (Justified)

### 6.1 CommonJS build output for logging and storage

**Plan assumption:** `tsc` with `config-typescript/base.json` defaults suffices.

**Reality:** Default `module: ESNext` emitted ESM `export` syntax in `dist/index.js`. NestJS dev (`nest start --watch`) failed at runtime: `Cannot find module '.../packages/logging/dist/logger'`.

**Fix (M9 scope only):** Set `module: CommonJS`, `moduleResolution: Node` in both packages' `tsconfig.json` — same pattern as `packages/constants`. Rebuild produces `require("./logger")` interop that Nest consumes correctly.

### 6.2 `@types/node` devDependency

**Plan assumption:** zero additional devDependencies beyond `typescript` for logging.

**Reality:** `process.stdout` in console transport and `node:fs/promises` in storage adapter require Node type definitions; `types: ["node"]` in tsconfig alone is insufficient without the package installed.

**Fix:** Added `@types/node` ^22.15.3 to both packages (aligned with `apps/web`). Dev-only; no runtime dependency.

### 6.3 Nest framework logs also structured

**Plan expectation:** Bootstrap and `PrismaService` lines validated.

**Additional outcome:** Nest's own startup logs (`NestFactory`, `InstanceLoader`, `RoutesResolver`, etc.) also emit through the custom `LoggerService` once `app.useLogger()` is set — all appear as structured JSON with appropriate `context` fields. This is desirable (consistent log shape) and does not change HTTP behavior.

## 7. Validation Results

### 7.1 Package builds and typechecks

| Check | Result |
|---|---|
| `pnpm install` | **Pass** |
| `pnpm --filter @st-manager/logging build` | **Pass** |
| `pnpm --filter @st-manager/logging typecheck` | **Pass** |
| `pnpm --filter @st-manager/storage build` | **Pass** |
| `pnpm --filter @st-manager/storage typecheck` | **Pass** |
| `pnpm --filter @st-manager/storage smoke` | **Pass** — `M9 storage smoke: put/get/delete cycle passed`; traversal key rejected |

### 7.2 API checks

| Check | Result |
|---|---|
| `pnpm --filter @st-manager/api typecheck` | **Pass** |
| `pnpm --filter @st-manager/api build` | **Pass** |
| `pnpm lint` | **Pass** — 0 errors, 0 warnings (after replacing `console.log` in smoke script with `process.stdout.write`) |
| `pnpm build` (root, 13 tasks) | **Pass** |

### 7.3 Logging Definition of Done (API dev)

**Setup:**

```bash
pnpm --filter @st-manager/api dev
```

**Sample stdout (abbreviated):**

```json
{"timestamp":"2026-07-03T08:13:09.506Z","level":"info","service":"st-manager-api","context":"PrismaService","message":"Using \"sqlite\" Prisma client for NODE_ENV=\"development\" (lazy — no connection opened yet)."}
{"timestamp":"2026-07-03T08:13:09.506Z","level":"info","service":"st-manager-api","context":"Bootstrap","message":"ST Manager API listening on http://localhost:4000"}
```

All required fields present: `timestamp`, `level`, `service`, `context`, `message`.

### 7.4 Regression checks

| Check | Result |
|---|---|
| `curl http://localhost:4000/health` | **Pass** — `status: ok` |
| `curl http://localhost:4000/studios` | **Pass** — `{ success: true, data: [...] }` |
| Storage wired into API routes | **Confirmed absent** — no upload endpoints added |
| `apps/desktop` / `apps/web` | **Unchanged** |

### 7.5 Root `pnpm typecheck`

Still **fails** on remaining empty scaffold packages (`packages/ai`, `packages/events`, etc.) — pre-existing `TS18003`, unrelated to M9. `@st-manager/{logging,storage,api}` typecheck cleanly in isolation.

## 8. Risks / Remaining Issues

1. **JSON-only dev output** — no colorized Nest console logs; acceptable per approved decision; pretty formatter can be added later as a separate export.
2. **Storage not feature-integrated** — adapter exists but no API/client uses it until a future milestone (e.g. file uploads).
3. **Client apps still use framework defaults** — desktop/web do not import `@st-manager/logging` yet; deferred per M9 scope.
4. **Root `pnpm typecheck` still fails** — `ai`, `events`, and other empty scaffolds remain; unchanged by M9 except `logging` and `storage` now pass.
5. **Nest internal log volume** — routing/module initialization logs are verbose in dev; may want level filtering in a future milestone.

## 9. Definition of Done — Status

- [x] `packages/logging` exports `createLogger` + `createConsoleTransport` with JSON formatter; builds and typechecks.
- [x] `apps/api` emits structured JSON via shared logger (`StManagerNestLoggerService` + `app.useLogger()`).
- [x] `packages/storage` exports `createLocalFilesystemAdapter`; builds and typechecks.
- [x] Smoke script exercises put/get/delete successfully.
- [x] Storage adapter **not** wired into any feature endpoint.
- [x] `pnpm lint` and `pnpm build` pass repository-wide.
- [x] `pnpm --filter @st-manager/{logging,storage,api} typecheck` pass in isolation.
- [x] This implementation report written before any commit.
- [x] No git commit or push (per instructions).

## 10. Git Status

Working tree has all M9 changes **uncommitted**, per instructions. Modified/created files are confined to `packages/logging/`, `packages/storage/`, `apps/api/`, `pnpm-lock.yaml`, and `docs/meeting-notes/M9-planning-report.md` + this report. Untracked `M6-commit-summary.md` and `M7-commit-summary.md` from prior milestones remain separately uncommitted and are **not** part of M9 scope.

## 11. Next Recommended Milestone

**M10 — Auth Decision and Minimal Implementation.** Protect Studio endpoints; JWT/session in API; token injection in `packages/api-sdk`. M10 has **not** been started.

---

Stopping here per instructions — nothing has been committed. Awaiting review before any commit.
