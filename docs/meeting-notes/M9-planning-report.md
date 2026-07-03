# M9 Planning Report — Logging and Storage Wiring

- Date: 2026-07-03
- Milestone: M9 (Logging and Storage Wiring)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md), [docs/roadmap/milestones.md](../roadmap/milestones.md), M3/M5 planning and implementation reports (Nest logger deferral to M9), M8 implementation report, `packages/logging/README.md`, `packages/storage/README.md`
- Status: **Planning only — no application code, dependencies, scaffolding commands, or commits have been generated.** Awaiting approval before implementation.

**Note on source documents:** `roadmap/milestones/M9.md` does not exist in this repository. M9 scope is taken verbatim from `docs/roadmap/phase2-roadmap.md` §M9 and the duplicate entry in `docs/roadmap/milestones.md`.

## 1. Current Repository State

Repository history after M8 (`87a9f7d`):

```
526a818 refactor: make packages/utils Studio-specific, add M0+M1 implementation report
c48f8ba feat(database): implement Prisma 7 database layer                    (M2)
5a337c2 feat(api): bootstrap NestJS API with health endpoint                  (M3)
e4ec488 feat(contracts,sdk): add Studio API contracts and SDK thread          (M4)
5e9e616 feat(api): implement Studio CRUD feature module                       (M5)
957abcd feat(ui): implement theme tokens, Tailwind v4 preset, and shared UI primitives (M6)
c22bc85 feat(desktop): bootstrap Tauri 2 shell with Studio list/create        (M7)
87a9f7d feat(web): bootstrap Next.js portal with Studio list/create           (M8)
```

What exists and is real going into M9:

- **`apps/api`** (M3, M5, M8 unchanged): NestJS server with `GET /health`, `POST /studios`, `GET /studios`, global `HttpExceptionFilter`, `PrismaService`. **All logging today uses `@nestjs/common`'s `Logger`** in three places: `main.ts`, `PrismaService`, `HttpExceptionFilter`. M5 explicitly deferred `packages/logging` to M9 and left `HttpExceptionFilter` written for a future injected logger swap (DI via `APP_FILTER` already in place).
- **`apps/desktop`** (M7) and **`apps/web`** (M8): working Studio list/create clients. **No client-side logging or storage wiring is required by the roadmap for M9.**
- **`packages/logging`**: scaffolding only — `package.json` with `typecheck` script, empty `src/transports/.gitkeep` and `src/formatters/.gitkeep`, README describing intended contracts. **No exported implementation; root `pnpm typecheck` fails here with `TS18003`.**
- **`packages/storage`**: scaffolding only — same empty scaffold pattern, README describing adapter contracts for local filesystem and remote (S3-compatible). **No exported implementation; root `pnpm typecheck` fails here with `TS18003`.**
- **Prior milestone precedent:** M1 packages (`types`, `constants`, `utils`, `validation`) use `tsc` build to `dist/` with `main`/`types` fields. M6 `packages/theme` uses `tsx` for a build-time script — relevant precedent for a storage smoke script.
- **Toolchain:** Node 20.20.2, pnpm 9.0.0 (verified in prior milestones).

What is pure scaffolding today (this milestone's actual targets):

```
packages/logging/
  README.md                     (status: scaffolding only)
  package.json                  (typecheck only, no build/main/exports)
  tsconfig.json                 (extends config-typescript/base, outDir dist)
  src/transports/.gitkeep
  src/formatters/.gitkeep

packages/storage/
  README.md                     (status: scaffolding only)
  package.json                  (typecheck only, no build/main/exports)
  tsconfig.json                 (extends config-typescript/base, outDir dist)
  src/adapters/.gitkeep
  src/types/.gitkeep
```

No `apps/api` dependency on either package yet. No feature endpoint uses file storage.

## 2. M9 Goal (from the Roadmap, Verbatim Scope)

> **Goal:** cross-cutting concerns wired once, reused everywhere.
>
> - Implement a console transport for `packages/logging` and wire it into `apps/api`'s Nest logger.
> - Implement a local-filesystem adapter for `packages/storage` (not yet used by a feature — just proven functional).
>
> **Depends on:** M3.
>
> **Definition of done:** API logs structured JSON via the shared logger interface; a throwaway script exercises the storage adapter's put/get/delete.

**Scope interpretation (strict):**

- **In scope:** implement `packages/logging` (shared interface + console/JSON transport), wire into **`apps/api` only** for structured JSON output; implement `packages/storage` local-filesystem adapter and prove it with a throwaway script.
- **Out of scope:** wire logging into `apps/desktop` or `apps/web`; wire storage into any API route or client feature; S3/remote storage adapter implementation; remote logging transport implementation; auth (M10); sync (M11); AI (M12); CI (M13); changes to Studio CRUD behavior.

M9 does **not** depend on M7 or M8. Both clients continue to work unchanged.

## 3. `packages/logging` Architecture

### 3.1 Design principles

Per `packages/logging/README.md`: **provider-agnostic contract** shared by NestJS, Next.js, and Tauri. The package owns the interface and a reference console transport; consuming apps choose wiring. M9 delivers the contract + console transport + JSON formatter; M9 wires **only** the NestJS API app.

### 3.2 Proposed module layout

```
packages/logging/src/
  types.ts                        # LogLevel, LogContext, LogRecord
  logger.ts                       # Logger interface + createLogger()
  formatters/
    json.ts                       # formatLogRecord(record) → string (single-line JSON)
  transports/
    console.ts                    # createConsoleTransport({ formatter })
  index.ts                        # public exports
```

Remove superseded `.gitkeep` files when real content lands.

### 3.3 Core types (conceptual)

| Type | Purpose |
|---|---|
| `LogLevel` | `"debug" \| "info" \| "warn" \| "error"` |
| `LogRecord` | `{ timestamp, level, service, context?, message, meta?, error? }` — stable JSON shape for all apps |
| `Logger` | `{ debug, info, warn, error }` methods accepting `(message, meta?)` |
| `LogTransport` | `{ write(record: LogRecord): void }` — pluggable sink |
| `CreateLoggerOptions` | `{ service: string; context?: string; transport: LogTransport; minLevel?: LogLevel }` |

**Structured JSON line shape (Definition of Done target):**

```json
{"timestamp":"2026-07-03T08:00:00.000Z","level":"info","service":"st-manager-api","context":"Bootstrap","message":"ST Manager API listening on http://localhost:4000"}
```

For errors (e.g. 500 handling in `HttpExceptionFilter`), include `error.message` and `error.stack` in `meta` or a dedicated `error` field — never leak stack to HTTP clients (existing M5 behavior preserved).

### 3.4 Console transport

- `createConsoleTransport({ formatter })` writes formatted output to **`process.stdout`** (info/debug) and **`process.stderr`** (warn/error) — or a single stream with level in JSON (recommended: level always in JSON body; write all lines to stdout for log aggregation compatibility).
- Formatter defaults to JSON (`formatJsonLogRecord`).
- No third-party logging libraries (winston, pino) — keep the package zero runtime dependencies beyond Node builtins, matching M1 leaf-package style.

### 3.5 Build and exports

Align with M1 packages:

- Add `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`, `"build": "tsc -p tsconfig.json"` to `package.json`.
- Export `createLogger`, `createConsoleTransport`, `formatJsonLogRecord`, and public types from `src/index.ts`.
- Resolves `@st-manager/logging`'s pre-existing `TS18003` failure.

**Remote transport:** define a `RemoteLogTransportOptions` type or interface stub in `types.ts` only (documented, not implemented) — satisfies README's "console, remote" contract mention without pulling network scope into M9.

## 4. `apps/api` NestJS Logger Wiring

### 4.1 Integration strategy (recommended)

Use NestJS's **`LoggerService`** bridge so existing `new Logger(context)` call sites require **minimal or zero changes**:

1. Add `apps/api/src/common/logging/st-manager-nest-logger.service.ts` — implements Nest's `LoggerService`, delegates to `createLogger({ service: "st-manager-api", transport: createConsoleTransport(...) })`.
2. In `main.ts`, after `NestFactory.create`, call `app.useLogger(app.get(StManagerNestLoggerService))` **or** pass `{ logger: ... }` to `NestFactory.create` options.
3. Existing usages in `main.ts`, `PrismaService`, and `HttpExceptionFilter` continue using `@nestjs/common`'s `Logger` — Nest routes them through the custom `LoggerService`.

This fulfills the roadmap's "wire it into `apps/api`'s Nest logger" without rewriting every service. The M5 `HttpExceptionFilter` DI comment remains valid; optional follow-up in implementation: inject `StManagerNestLoggerService` directly in the filter constructor for explicit testability — **not required** if global `useLogger` covers all paths.

### 4.2 Files touched in `apps/api`

| File | Change |
|---|---|
| `package.json` | Add `"@st-manager/logging": "workspace:*"` dependency |
| `src/common/logging/st-manager-nest-logger.service.ts` | **New** — Nest `LoggerService` adapter |
| `src/app.module.ts` | Register `StManagerNestLoggerService` as provider (if needed for `app.get`) |
| `src/main.ts` | Wire custom logger at bootstrap |
| `src/common/filters/http-exception.filter.ts` | Update comment only (unless explicit injection chosen); verify 500 logs emit structured JSON with stack |
| `src/common/prisma/prisma.service.ts` | No code change expected if global logger works |

**Explicitly unchanged:** Studio routes, Prisma schema, contracts, validation, CORS, health/studios controllers.

### 4.3 Validation signal for logging

Start `pnpm --filter @st-manager/api dev` and confirm:

- Bootstrap line is single-line JSON with `"level":"info"`, `"service":"st-manager-api"`, `"context":"Bootstrap"`.
- Prisma provider selection log is structured JSON with `"context":"PrismaService"`.
- Trigger a controlled 500 (optional: temporary throw in health handler during validation, reverted before commit) — filter logs structured JSON with stack server-side only.

No change to HTTP response shapes.

## 5. `packages/storage` Architecture

### 5.1 Design principles

Per `packages/storage/README.md`: **unified file/blob storage interface** for uploads (client photos, session attachments, exports). M9 implements the **local filesystem adapter only** and proves it outside any feature.

### 5.2 Proposed module layout

```
packages/storage/src/
  types/
    stored-object.ts              # StoredObject, PutOptions, GetResult
    errors.ts                     # StorageNotFoundError, StorageError
  adapters/
    storage-adapter.ts            # StorageAdapter interface
    local-filesystem.ts           # createLocalFilesystemAdapter({ basePath })
  index.ts                        # public exports

packages/storage/scripts/
  smoke.ts                        # throwaway put/get/delete exercise

packages/storage/.gitignore        # .data/ (local test artifacts)
```

Remove superseded `.gitkeep` files when real content lands.

### 5.3 Core types (conceptual)

| Type | Purpose |
|---|---|
| `StorageAdapter` | `put(key, data, options?)`, `get(key)`, `delete(key)` |
| `StoredObject` | `{ key, size, mimeType?, createdAt }` returned from `put` |
| `PutOptions` | `{ mimeType?: string; overwrite?: boolean }` |
| `StorageNotFoundError` | Thrown by `get` when key missing |

**Key safety:** sanitize keys — reject `..`, absolute paths, and leading `/` so the adapter cannot escape `basePath`.

### 5.4 Local filesystem adapter

- `createLocalFilesystemAdapter({ basePath: string })` — resolves paths under `basePath` using `node:fs/promises`.
- `put` creates parent directories as needed; writes file; returns `StoredObject`.
- `get` reads file; throws `StorageNotFoundError` if absent.
- `delete` removes file; throws `StorageNotFoundError` if absent (recommended — makes smoke test assertions explicit).

**Not implemented in M9:** S3-compatible/remote adapter (interface type only or documented future slot in README).

### 5.5 Throwaway smoke script

Per roadmap Definition of Done:

```
packages/storage/scripts/smoke.ts
```

Run via package script (precedent: `packages/theme` uses `tsx`):

```json
"smoke": "tsx scripts/smoke.ts"
```

Script flow:

1. Create adapter with `basePath` = `packages/storage/.data/smoke` (gitignored).
2. `put("m9-smoke-test.txt", Buffer.from("M9 storage smoke"))`.
3. `get("m9-smoke-test.txt")` — assert content matches.
4. `delete("m9-smoke-test.txt")`.
5. `get` again — expect `StorageNotFoundError`; log success and exit 0.

Add `"build": "tsc -p tsconfig.json"`, `main`/`types` to `package.json`. Resolves `@st-manager/storage`'s pre-existing `TS18003` failure.

**No API route, no desktop/web integration, no database column for file paths in M9.**

## 6. Dependencies Required and Justification

### 6.1 `packages/logging`

| Dependency | Type | Why |
|---|---|---|
| `typescript` | devDependency | Already present; unchanged |

**No runtime dependencies.** Zero-dep structured logging.

### 6.2 `packages/storage`

| Dependency | Type | Why |
|---|---|---|
| `typescript` | devDependency | Already present |
| `tsx` | devDependency | Run smoke script (same as `packages/theme`) |

**No runtime dependencies** beyond Node `node:fs/promises`, `node:path`.

### 6.3 `apps/api`

| Dependency | Type | Why |
|---|---|---|
| `@st-manager/logging` | dependency (workspace) | Nest logger wiring |

No new third-party npm packages.

**Not added:** `@st-manager/storage` to `apps/api` (storage not used by API yet).

## 7. Files to Create

**`packages/logging/`**

- `src/types.ts`
- `src/logger.ts`
- `src/formatters/json.ts`
- `src/transports/console.ts`
- `src/index.ts`

**`packages/storage/`**

- `src/types/stored-object.ts`
- `src/types/errors.ts`
- `src/adapters/storage-adapter.ts`
- `src/adapters/local-filesystem.ts`
- `src/index.ts`
- `scripts/smoke.ts`
- `.gitignore` (ignore `.data/`)

**`apps/api/`**

- `src/common/logging/st-manager-nest-logger.service.ts`

**`docs/`**

- `docs/meeting-notes/M9-implementation-report.md` — produced at implementation time, not now.

## 8. Files to Modify

- `packages/logging/package.json` — `build`, `main`, `types` exports.
- `packages/logging/README.md` — status: implemented; document JSON shape and usage.
- `packages/storage/package.json` — `build`, `main`, `types`, `smoke` script; add `tsx` devDependency.
- `packages/storage/README.md` — status: local adapter implemented; smoke script documented.
- `apps/api/package.json` — add `@st-manager/logging` workspace dependency.
- `apps/api/src/main.ts` — register custom Nest logger.
- `apps/api/src/app.module.ts` — provider for `StManagerNestLoggerService` (if required by wiring approach).
- `pnpm-lock.yaml` — regenerated by `pnpm install`.

**Explicitly not modified:** `apps/desktop`, `apps/web`, `packages/ui`, `packages/api-sdk`, `packages/contracts`, `packages/database`, Studio modules, `eslint.config.mjs` (unless lint surfaces issues in new files), frozen architecture docs.

## 9. Risks

1. **Nest `Logger` vs custom `LoggerService` behavior.** Nest's built-in `Logger` maps some methods differently (`verbose` → debug). Mitigation: implement full `LoggerService` interface in the adapter; verify all existing call sites (`log`, `error`) produce JSON.

2. **JSON-only output in development.** Developers lose Nest's default colorized pretty logs. Mitigation: acceptable per roadmap DoD ("structured JSON"); optional pretty formatter can be added later as a separate export without changing the interface.

3. **Storage key path traversal.** Mitigation: strict key sanitization in `local-filesystem.ts`; unit-test or smoke-script assertion for rejected `../` keys.

4. **Smoke script writes to disk.** Mitigation: confine to gitignored `.data/` under `packages/storage`; smoke script cleans up or uses ephemeral subdirectory.

5. **Root `pnpm typecheck` still fails on other empty packages.** After M9, `logging` and `storage` pass; `packages/ai`, `packages/events`, and any other zero-source scaffolds may still emit `TS18003`. Validate M9 packages in isolation (same pattern as M7/M8).

6. **Turbo build order.** `apps/api` build must depend on `@st-manager/logging` build (`^build` in `turbo.json` already handles this once logging has a `build` script).

7. **Scope creep into features.** Temptation to add a file-upload endpoint or client logging. Mitigation: this plan treats storage as adapter + smoke only; logging wired to API bootstrap/filter/service logs only.

## 10. Validation Strategy

1. `pnpm install` — after package.json changes; confirm lockfile updates.
2. `pnpm --filter @st-manager/logging build` and `typecheck` — pass.
3. `pnpm --filter @st-manager/storage build`, `typecheck`, and `smoke` — pass; smoke exits 0.
4. `pnpm --filter @st-manager/api build` and `typecheck` — pass with new dependency.
5. `pnpm lint` — zero new errors/warnings.
6. **Logging Definition of Done:**

   ```bash
   pnpm --filter @st-manager/api dev
   ```

   Inspect stdout — bootstrap and `PrismaService` lines are valid single-line JSON with `timestamp`, `level`, `service`, `context`, `message`.

7. **Storage Definition of Done:**

   ```bash
   pnpm --filter @st-manager/storage smoke
   ```

   Confirm put/get/delete cycle succeeds and missing-key `get` throws as expected.

8. **Regression:** `pnpm build` (root) — all tasks pass including `@st-manager/api`, `@st-manager/logging`, `@st-manager/storage`; M7/M8 apps unchanged.
9. **Optional regression:** existing Studio list/create still works (`curl localhost:4000/studios`) — logging wiring must not alter routes.

## 11. Definition of Done

- [ ] `packages/logging` exports a working `createLogger` + `createConsoleTransport` with JSON formatter; package builds and typechecks.
- [ ] `apps/api` emits **structured JSON** logs via the shared logger interface (Nest global logger wiring); no `console.log` introduced.
- [ ] `packages/storage` exports `createLocalFilesystemAdapter`; package builds and typechecks.
- [ ] Throwaway smoke script exercises **put/get/delete** successfully.
- [ ] Storage adapter is **not** wired into any feature endpoint (by design).
- [ ] `pnpm lint` and `pnpm build` pass repository-wide with zero new errors attributable to M9.
- [ ] `pnpm --filter @st-manager/{logging,storage,api} typecheck` pass in isolation.
- [ ] `docs/meeting-notes/M9-implementation-report.md` written at implementation time.
- [ ] Nothing committed until implementation report is reviewed and approved (M1–M8 workflow).

## 12. Next Recommended Milestone

**M10 — Auth Decision and Minimal Implementation.** Protect Studio endpoints; JWT/session in API; token injection in `packages/api-sdk`. M10 has **not** been started.

---

**Open decisions requiring explicit approval before implementation** (summarized for one-pass review):

1. **Nest integration mechanism:** register a custom **`LoggerService` via `app.useLogger()`** so existing `new Logger(context)` call sites keep working (recommended — minimal diff, fulfills roadmap) vs. **replace every `Logger` usage manually** with injected `@st-manager/logging` instances (more explicit, larger diff).

2. **Log output format in development:** **JSON always** on stdout (recommended — matches DoD literally, log-aggregator friendly) vs. **pretty-print in development, JSON in production** (nicer local DX, two code paths).

3. **Storage smoke script runner:** **`tsx scripts/smoke.ts`** via package script (recommended — matches `packages/theme` precedent) vs. **compile-first** (`tsc` then `node dist/scripts/smoke.js`).

4. **Storage smoke artifact directory:** **`packages/storage/.data/`** gitignored (recommended) vs. **OS temp directory** (`os.tmpdir()` — no repo writes, less visible for debugging).

5. **Remote adapter / transport stubs:** export **TypeScript interfaces only** for remote/S3 logging and storage (recommended — documents future extension, zero network scope) vs. **omit entirely** until a later milestone needs them.

Stopping here per instructions — no source code, dependencies, scaffolding commands, or commits have been touched. Awaiting review and approval of this plan (and the five decisions above) before implementing M9.
