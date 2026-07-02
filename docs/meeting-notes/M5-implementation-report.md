# M5 Implementation Report — Studio API Feature Module

- Date: 2026-07-02
- Milestone: M5 (Studio API Feature Module)
- Source: [M5 planning report](./M5-planning-report.md), approved with 8 final architectural decisions (below)
- Status: **Implemented and validated.** Not yet committed — awaiting review.

## 1. Executive Summary

M5 implements the first real CRUD endpoints for the `Studio` resource: `POST /studios` (create) and `GET /studios` (list, paginated). The Controller → Service → Repository → Prisma layering from the M5 plan was built exactly as designed, with one contingency applied (a narrow, documented type cast in `StudiosRepository` — see §4/§7 Risk 1) and one scope decision made explicit (the "logging package" instruction, resolved to `@nestjs/common`'s `Logger` — see §3 decision 5).

Beyond the planned scope, implementing decision 4 ("standardize API responses") required extending `packages/contracts` (a new `ApiSuccessResponseDto<T>`, `success` flags added to `PaginatedResponseDto`/`ApiErrorResponseDto`, a new `CreateStudioResponseDto`) and `packages/api-sdk` (unwrapping the create-response envelope, adding `success: false` to constructed error objects) — both were already M4 deliverables that needed a small, compatible extension rather than a redesign.

All 14 sections of the M5 plan were implemented as specified. End-to-end verification (§6) ran real `curl` requests against the actual running server backed by the real SQLite dev database, plus an SDK smoke test against the same live server (closing the gap the M4 report flagged: M4 could only test against a `node:http` stub since the endpoint didn't exist yet).

## 2. Recap: The 8 Approved Architectural Decisions

| # | Decision | Where implemented |
|---|---|---|
| 1 | Keep Controller → Service → Repository → Prisma architecture | `studios.controller.ts` → `studios.service.ts` → `studios.repository.ts` → `PrismaService` (§4) |
| 2 | Use dedicated mappers for DTO conversion | `studios.mapper.ts` (`toStudioResponseDto`) — the only place `Date` → `string` happens (§4) |
| 3 | Never access Prisma outside the Repository layer | Only `studios.repository.ts` imports `PrismaService`/touches `.getClient()` (§4, §7 Risk 1) |
| 4 | Standardize API responses: `{ success, data, meta }` | New `ApiSuccessResponseDto<T>`, `success` added to `PaginatedResponseDto`/`ApiErrorResponseDto` (§3) |
| 5 | Use the logging package instead of `console.log()` | Scoped to `@nestjs/common`'s `Logger` — see decision note below |
| 6 | Keep database-generated IDs only | `StudiosRepository.create`'s input type has no `id` field; verified live (§6, test 4) |
| 7 | Add an ADR note reserving soft delete (`deletedAt`) for a future milestone | `docs/system-architecture/adr/0003-soft-delete-deferral.md` (§5) |
| 8 | Do not change the frozen architecture | No new packages/apps; standard NestJS resource-module pattern only |

**Decision 5 scoping note:** `packages/logging` remains scaffolding-only (no exported logger implementation exists — confirmed by reading `packages/logging/package.json`/`README.md` before implementation). Implementing it now would be new, unapproved scope for a package the roadmap schedules for a later milestone (implied M9, alongside `packages/storage`). The interpretation applied here is the practical, non-scope-creeping one: **zero `console.log`/`console.error`/`console.warn` calls anywhere in the new M5 code**; all logging goes through `@nestjs/common`'s `Logger` (the same tool `PrismaService` and `main.ts` already used since M3). `HttpExceptionFilter`'s constructor comment calls this out explicitly, and is written so that swapping in a real `packages/logging` client later (M9) is a one-line change (see §8 Future Extensibility). Flagging this now in case "the logging package" was meant literally — happy to revisit if so.

## 3. Standardized Response Envelope (Decision 4) — Design Detail

Every `apps/api` 2xx response body now carries a `success` discriminant:

| Response | Shape |
|---|---|
| `POST /studios` (201) | `CreateStudioResponseDto` = `{ success: true, data: StudioResponseDto }` |
| `GET /studios` (200) | `ListStudiosResponseDto` = `PaginatedResponseDto<StudioResponseDto>` = `{ success: true, data: StudioResponseDto[], meta: PaginationMetaDto }` |
| Any error | `ApiErrorResponseDto` = `{ success: false, statusCode, error, message, details?, path, timestamp }` |

`packages/api-sdk`'s `createStudiosApi.createStudio` unwraps the envelope (`response.data`) so SDK callers keep getting a plain `StudioResponseDto` back — the envelope is a wire-level/transport concept that shouldn't leak into `apps/web`/`apps/desktop` call sites. `listStudios` returns the full envelope as-is, since `meta` (pagination info) is genuinely useful to callers, not just plumbing.

## 4. Controller → Service → Repository → Prisma (Decisions 1–3) — Files

**`apps/api/src/modules/studios/studios.repository.ts`** — the only file touching `PrismaService.getClient()`:

```30:71:apps/api/src/modules/studios/studios.repository.ts
@Injectable()
export class StudiosRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: { name: string }): Promise<Studio> {
    const client = asStudioClient(this.prismaService.getClient());
    return client.studio.create({ data });
  }

  async findMany(params: { skip: number; take: number }): Promise<Studio[]> {
    const client = asStudioClient(this.prismaService.getClient());
    return client.studio.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
  }

  async count(): Promise<number> {
    const client = asStudioClient(this.prismaService.getClient());
    return client.studio.count();
  }
}
```

`asStudioClient` is the one deviation from "no casts" the M5 plan pre-approved as a contingency (Risk 1, planning report §13) — see §7 Risk 1 below for why it was needed and why it's safe.

**`apps/api/src/modules/studios/studios.service.ts`** — pagination math, no Prisma/HTTP awareness, operates on `CreateStudioInput`/`ListStudiosQueryInput` (Zod-inferred, always-defaulted types from `@st-manager/validation`) rather than the wire DTOs, resolving the type-precision gap the plan flagged in its own §3/§13.

**`apps/api/src/modules/studios/studios.controller.ts`** — HTTP only: `@Post()`/`@Get()`, `ZodValidationPipe` on `@Body()`/`@Query()`, calls the service, maps the domain result to a DTO via the mapper, returns the envelope.

**`apps/api/src/modules/studios/studios.mapper.ts`** — `toStudioResponseDto(studio: Studio): StudioResponseDto`, the sole `Date` → `.toISOString()` conversion point.

**`apps/api/src/modules/studios/studios.module.ts`** — wires the three; no explicit `imports` needed since `PrismaModule` is `@Global()` (M3).

## 5. ADR 0003 — Soft Delete Deferral (Decision 7)

Written at `docs/system-architecture/adr/0003-soft-delete-deferral.md`. Records: no `deletedAt` column is added in M5 (there is no delete endpoint yet — nothing to soft-delete), but the strategy for whenever `DELETE /studios/:id` is added is decided in advance (soft delete over hard delete, via a nullable `deletedAt DateTime?` column and a `StudiosRepository.softDelete()` method, never a raw Prisma `.delete()` call), so a future milestone doesn't need to re-litigate it.

## 6. Validation and End-to-End CRUD Verification

### 6.1 Build / Typecheck / Lint

```bash
pnpm install                        # new workspace dep edges linked correctly
pnpm run build                      # 8/8 tasks succeeded (turbo)
pnpm --filter @st-manager/api \
     --filter @st-manager/contracts \
     --filter @st-manager/api-sdk run typecheck   # all 3 pass
pnpm run lint                       # 0 errors, 0 warnings
```

`pnpm run typecheck` (root, all 19 packages) fails at `@st-manager/logging` with the same pre-existing `TS18003` ("no inputs found") documented in every prior milestone report (M2/M3/M4) — an empty-`src` scaffold package, unrelated to and unmodified by M5.

### 6.2 The Union-Type Risk Materialized (as predicted) and Was Resolved

Building `apps/api` initially failed exactly as the M5 planning report's Risk 1 anticipated:

```
error TS2349: This expression is not callable.
  Each member of the union type '...' has signatures, but none of those
  signatures are compatible with each other.
    33     return client.studio.findMany({
```

Applied the pre-approved contingency: a single, documented `asStudioClient()` cast inside `studios.repository.ts` (§4), narrowing `DatabaseClient` to `PostgresPrismaClient` at the one point `.studio` is accessed. `create()` alone compiled without it; `findMany()`/`count()` needed it (Prisma's overloaded generic method signatures don't unify across the two independently-generated client classes). After the cast, `apps/api` builds clean.

### 6.3 A Second, Related Issue Not Anticipated in Planning: ESM/CommonJS Interop

Starting the dev server crashed on first boot:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '/packages/constants/dist/errors' imported from
  '/packages/constants/dist/index.js'
```

This is the same root cause as M3's Error 12 (`packages/database`/`packages/validation` were fixed then): `packages/constants`, `packages/contracts`, and `packages/types` were still compiling as ESM (inheriting `base.json`), but `apps/api` (a CommonJS Nest app) now depends on all three directly for the first time in M5 and tries to `require()` them. **Fix:** applied the identical, already-established override to all three `tsconfig.json` files:

```json
"module": "CommonJS",
"moduleResolution": "Node",
"ignoreDeprecations": "6.0"
```

`packages/api-sdk` did **not** need this — it's never `require()`'d by `apps/api` (only by future `apps/web`/`apps/desktop`, which will use their own bundlers), and its own build/typecheck still pass unchanged after this fix.

### 6.4 End-to-End CRUD Verification (real SQLite dev database, `apps/api` running on :4000)

| # | Request | Result |
|---|---|---|
| 1 | `POST /studios {"name":"Downtown Studio"}` | `201`, `{success:true,data:{id,name,createdAt,updatedAt}}` (string dates) |
| 2 | `POST /studios {"name":"Uptown Studio"}` | `201`, second row created |
| 3 | `POST /studios {"name":""}` | `400`, `{success:false,error:"VALIDATION_ERROR",details:[{path:"name",message:"Studio name is required"}]}` |
| 4 | `POST /studios {"name":"...","id":"hacker-supplied-id"}` | `201`, **client-supplied `id` silently ignored** — server generated its own `cuid()` (decision 6 verified live) |
| 5 | `GET /studios` (defaults) | `200`, all 3 rows, `meta:{page:1,pageSize:20,total:3}` |
| 6 | `GET /studios?page=1&pageSize=2` | `200`, 2 newest rows (desc `orderBy` confirmed) |
| 7 | `GET /studios?page=2&pageSize=2` | `200`, the 1 remaining row — **no overlap with page 1** |
| 8 | `GET /studios?page=abc` | `400`, `VALIDATION_ERROR`, `"expected number, received NaN"` |
| 9 | `GET /studios?pageSize=9999` | `400`, `VALIDATION_ERROR`, `"expected number to be <=100"` (`PAGINATION.MAX_PAGE_SIZE`) |
| 10 | `GET /nonexistent` | `404`, `{success:false,error:"NOT_FOUND",message:"Cannot GET /nonexistent"}` — the catch-all filter correctly handles Nest's own internal routing exception, not just app-thrown ones |
| 11 | Production-mode boot (`NODE_ENV=production`, no live PostgreSQL) | App **boots successfully** — `getPrisma()` stays lazy, `PrismaService` logs `"Using postgresql Prisma client"`, no crash |
| 12 | `POST /studios` in production mode (connection refused) | `500`, `{success:false,error:"INTERNAL_ERROR",message:"Internal server error"}` — **no stack trace or connection string leaked to the client**; full `PrismaClientKnownRequestError` + stack logged server-side via `Logger.error` |
| 13 | SDK smoke test (`createStudiosApi`, via `tsx`, against the real running server — not a stub) | `createStudio` unwraps the envelope correctly (returns plain `StudioResponseDto`); `listStudios` returns the full paginated envelope; a raw `client.post` with an invalid body correctly normalizes the server's `400` into a thrown `ApiError` with `code: "VALIDATION_ERROR"` and populated `details` |

All 13 checks passed on the first run after the two fixes in §6.2/§6.3. The dev SQLite database (`packages/database/prisma/sqlite/dev.db`) now contains the 4 studios created during this verification pass (left in place; harmless local dev data).

## 7. Risks (Carried Forward and New)

1. **[Resolved as predicted] `PrismaService.getClient()`'s union return type.** The M5 plan's Risk 1 predicted this exactly and pre-approved the fix; §6.2 confirms it was needed for `findMany`/`count` (not `create`) and that the narrow `asStudioClient()` cast, confined to one file, resolves it without leaking the union type anywhere else.
2. **[New, found during implementation] `packages/constants`/`packages/contracts`/`packages/types` needed the M3 CommonJS-output fix.** Not anticipated in the M5 plan (the plan's dependency analysis, §9, correctly identified these three as *new* `apps/api` dependencies but didn't flag the ESM/CJS consequence). Fixed identically to M3's precedent (§6.3); the pattern is now applied to every package `apps/api` depends on.
3. **No live PostgreSQL in this environment** (carried from M2/M3/M4). §6.4 test 11–12 prove the app boots and fails *gracefully* in production mode, but a real `Studio` row has still never been created/read against actual PostgreSQL.
4. **`findMany`/`count` remain two separate, non-transactional queries** (accepted in planning, unchanged here) — under concurrent writes, `meta.total` could theoretically be momentarily inconsistent with `data`. Not observed in testing; accepted as a documented limitation.
5. **No automated tests exist yet.** All verification in §6.4 is manual `curl`/`tsx`, consistent with M2–M4 precedent. Remains M13 scope per the roadmap.
6. **`packages/logging` scoping decision (§2, decision 5)** is an interpretation, not a certainty — flagged explicitly for review in case full `packages/logging` implementation was actually intended.

## 8. Future Extensibility (Unchanged From Planning, Confirmed Still Accurate)

- `GET /studios/:id`, `PATCH /studios/:id`, `DELETE /studios/:id` — layering extends directly; `DELETE` should apply ADR 0003's soft-delete strategy.
- `NOT_FOUND` mapping in `HttpExceptionFilter` is already wired and was verified live (§6.4 test 10) against Nest's own routing 404, ahead of the first single-resource endpoint needing it for real.
- Auth (M10): `@UseGuards(...)` can be added to individual `StudiosController` methods without touching the service/repository/mapper layers.
- A second resource module reuses `ZodValidationPipe<T>`, `HttpExceptionFilter`, and `PaginatedResponseDto<T>`/`ApiSuccessResponseDto<T>` unchanged.
- `packages/logging` (M9): once implemented, `HttpExceptionFilter`'s constructor can take an injected logger instead of the plain `Logger` — the `APP_FILTER` DI-based registration (chosen over `app.useGlobalFilters()`) is specifically what makes that swap possible later without restructuring.
- Desktop/web (M7/M8) can now consume `packages/api-sdk`'s `createStudiosApi` against a real, working backend for the first time.

## 9. Files Created

**`apps/api/src/common/`**
- `pipes/zod-validation.pipe.ts`
- `filters/http-exception.filter.ts`

**`apps/api/src/modules/studios/`**
- `studios.module.ts`
- `studios.controller.ts`
- `studios.service.ts`
- `studios.repository.ts`
- `studios.mapper.ts`

**`packages/contracts/src/`**
- `common/success-response.dto.ts` (`ApiSuccessResponseDto<T>`)
- `studio/create-studio-response.dto.ts` (`CreateStudioResponseDto`)

**`docs/`**
- `system-architecture/adr/0003-soft-delete-deferral.md`
- `meeting-notes/M5-implementation-report.md` (this file)

## 10. Files Modified

| File | Change |
|---|---|
| `apps/api/package.json` | Added `@st-manager/contracts`, `@st-manager/constants`, `@st-manager/types`, `zod` dependencies |
| `apps/api/src/app.module.ts` | Registered `StudiosModule`; registered `HttpExceptionFilter` via `APP_FILTER` |
| `packages/contracts/src/common/pagination.dto.ts` | `PaginatedResponseDto<T>` gained `success: true` |
| `packages/contracts/src/common/error-response.dto.ts` | `ApiErrorResponseDto` gained `success: false` |
| `packages/contracts/src/index.ts` | Export `ApiSuccessResponseDto`, `CreateStudioResponseDto` |
| `packages/contracts/README.md` | Documents the three response envelopes and M5 status |
| `packages/contracts/tsconfig.json` | Added CommonJS override (§6.3) |
| `packages/constants/tsconfig.json` | Added CommonJS override (§6.3) |
| `packages/types/tsconfig.json` | Added CommonJS override (§6.3) |
| `packages/api-sdk/src/client/api-error.ts` | `success: false` added to `networkError`/`unknownError` literals |
| `packages/api-sdk/src/client/http-client.ts` | `success: false` added to `parseErrorResponse`'s constructed `ApiError` |
| `packages/api-sdk/src/studios/studios.api.ts` | `createStudio` now unwraps `CreateStudioResponseDto.data`; doc comment updated (endpoint is real) |
| `packages/api-sdk/README.md` | Status updated from "will fail until M5" to implemented |

No changes to `packages/database`, `packages/validation`, `apps/web`, or `apps/desktop`. No changes to the frozen architecture (decision 8) — no new packages or apps.

## 11. Next Recommended Milestone

Per the roadmap's critical path (`M0 → M1 → M2 → M3 → M4 → M5 → M7`), **M6/M7** — the first running desktop or web client consuming `packages/api-sdk` against this now-real `Studio` API — is the natural next step. Alternatively, if the `packages/logging` scoping decision (§2) should be revisited with a real implementation, that could be pulled forward from M9 before M7.

## 12. Next Step

Stopping here per instructions — **not committed**. Awaiting review of the standardized-response design (§3), the two fixes applied beyond the original plan (§6.2, §6.3), the `packages/logging` scoping interpretation (§2 decision 5), and ADR 0003 (§5) before this is committed.
