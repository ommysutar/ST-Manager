# M5 Planning Report — Studio API Feature Module

- Date: 2026-07-02
- Milestone: M5 (Studio API Feature Module)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md), [M3 implementation report](./M3-implementation-report.md), [M4 planning report](./M4-planning-report.md), [M4 implementation report](./M4-implementation-report.md), frozen v3 architecture, ADR 0001, ADR 0002
- Status: **Planning only — no application code has been generated.** Awaiting approval before implementation.

## 0. Recap: What Exists After M4

- **Database** (M2): `packages/database` exports `getPrisma()` (lazy PostgreSQL client) and `createSqlitePrismaClient()` (SQLite client factory). Both generated from near-identical `Studio` schemas (`id`, `name`, `createdAt`, `updatedAt`, `@@map("studios")`).
- **API bootstrap** (M3): `apps/api` runs via `@nestjs/cli`. `AppModule` wires a validated, global `ConfigModule` and a `@Global()` `PrismaModule`. `PrismaService.getClient(): DatabaseClient` (`= PostgresPrismaClient | SqlitePrismaClient`) selects the provider from `NODE_ENV` at construction time, lazily, and is currently **unused by any route** — only `HealthController` exists, and it deliberately doesn't touch `PrismaService`.
- **Contracts** (M4): `packages/contracts` defines `CreateStudioDto`, `StudioResponseDto`, `ListStudiosQueryDto`, `ListStudiosResponseDto` (= `PaginatedResponseDto<StudioResponseDto>`), and `ApiErrorResponseDto` — all `export type`, dependency-light (only `@st-manager/types`).
- **Validation** (M1, extended M4): `createStudioSchema` and `listStudiosQuerySchema` (both Zod, both in `packages/validation`, both already checked against their `packages/contracts` counterparts at their own definition sites).
- **Error codes** (M4): `API_ERROR_CODES` (`VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`, `NETWORK_ERROR`, `UNKNOWN_ERROR`) in `packages/constants`.
- **SDK** (M4): `packages/api-sdk`'s `createStudiosApi(client)` already calls `POST`/`GET /studios` with the exact contract shapes above — it currently fails with a `NETWORK_ERROR` `ApiError` because the endpoint doesn't exist. This is the "temporary stub" the roadmap says M5 must resolve.
- **What's explicitly missing:** `apps/api` has no `StudiosModule`, no validation pipe, no exception filter, and does not yet depend on `@st-manager/contracts`, `@st-manager/constants`, or `@st-manager/types` at all.

Per the roadmap, M5's definition of done is: **an end-to-end `curl` (or REST client) can create and list studios against a real SQLite/Postgres dev database.** MVP scope is **Create + List only** — no update, no delete, no single-resource `GET /studios/:id` (the roadmap's own wording: "real CRUD (Create + List for MVP)").

## 1. Studio CRUD Architecture

Standard four-layer NestJS resource module, all under `apps/api/src/modules/studios/`:

```
HTTP request
     │
     ▼
StudiosController   — HTTP concerns only: routes, status codes, param/body extraction,
     │                 Zod-pipe-validated input → domain call → DTO-mapped output
     ▼
StudiosService      — business logic: pagination math, orchestration
     │                 (no framework/HTTP concerns, no direct Prisma calls)
     ▼
StudiosRepository   — the only place that calls PrismaService.getClient().studio.*
     │                 returns/accepts @st-manager/types' Studio (domain shape),
     ▼                 never a DTO, never a raw Prisma-generated type
PrismaService (M3)  — already exists; selects postgresql/sqlite by NODE_ENV
```

Each layer only talks to the one directly below it. `StudioResponseDto` (the wire shape) is never seen by `StudiosService`/`StudiosRepository` — only `StudiosController` maps `Studio` (domain) → `StudioResponseDto` (wire), via a dedicated mapper (§2), right before returning. This keeps the `Date` → `string` serialization concern (flagged in the M4 plan) resolved in exactly one place.

## 2. Controller Design

`apps/api/src/modules/studios/studios.controller.ts`:

```ts
@Controller(ROUTES.STUDIOS) // "studios" — no hardcoded string, no version prefix
export class StudiosController {
  constructor(private readonly studiosService: StudiosService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body(new ZodValidationPipe(createStudioSchema)) dto: CreateStudioDto,
  ): Promise<StudioResponseDto> {
    const studio = await this.studiosService.create(dto);
    return toStudioResponseDto(studio);
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(listStudiosQuerySchema)) query: ListStudiosQueryDto,
  ): Promise<ListStudiosResponseDto> {
    const { data, meta } = await this.studiosService.list(query);
    return { data: data.map(toStudioResponseDto), meta };
  }
}
```

- `toStudioResponseDto(studio: Studio): StudioResponseDto` lives in a new `studios.mapper.ts` — a small pure function, not a class, converting `createdAt`/`updatedAt` from `Date` to `.toISOString()`. This is the concrete implementation of the serialization fix the M4 plan called out as a design principle but couldn't build (no controller existed yet).
- The controller never imports anything from `@st-manager/database` — only `@st-manager/contracts` (DTO types) and `@st-manager/types` (via the mapper's input type). It has zero Prisma awareness.

## 3. Service Design

`apps/api/src/modules/studios/studios.service.ts`:

```ts
@Injectable()
export class StudiosService {
  constructor(private readonly studiosRepository: StudiosRepository) {}

  async create(input: CreateStudioDto): Promise<Studio> {
    return this.studiosRepository.create({ name: input.name });
  }

  async list(query: ListStudiosQueryDto): Promise<{ data: Studio[]; meta: PaginationMetaDto }> {
    // query.page/query.pageSize are always present here — listStudiosQuerySchema
    // applies PAGINATION defaults via the validation pipe before this is called.
    const page = query.page ?? PAGINATION.DEFAULT_PAGE_SIZE_PLACEHOLDER; // see note below
    const pageSize = query.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.studiosRepository.findMany({ skip, take: pageSize }),
      this.studiosRepository.count(),
    ]);

    return { data, meta: { page, pageSize, total } };
  }
}
```

(The `PAGINATION.DEFAULT_PAGE_SIZE_PLACEHOLDER` line above is illustrative only — since `ListStudiosQueryDto`'s fields are optional at the type level but the Zod pipe guarantees they're populated by the time the controller calls the service, the real implementation will decide whether to re-express that guarantee in the type system, e.g. a distinct `ListStudiosQueryInput`-typed service parameter instead of the wire-level `ListStudiosQueryDto`. Flagged here as an implementation-time decision, not left ambiguous by accident.)

`StudiosService` holds all business/orchestration logic — currently just pagination math — and is the layer that would grow if real business rules appear later (e.g. name uniqueness, soft deletes). It has no knowledge of HTTP (no status codes, no DTOs) and no knowledge of Prisma (only `StudiosRepository`'s domain-shaped interface).

## 4. Repository Pattern

`apps/api/src/modules/studios/studios.repository.ts` — the **only** file in this module that calls `PrismaService.getClient()`:

```ts
@Injectable()
export class StudiosRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: { name: string }): Promise<Studio> {
    return this.prismaService.getClient().studio.create({ data });
  }

  async findMany(params: { skip: number; take: number }): Promise<Studio[]> {
    return this.prismaService.getClient().studio.findMany({
      ...params,
      orderBy: { createdAt: "desc" }, // deterministic pagination — see §13
    });
  }

  async count(): Promise<number> {
    return this.prismaService.getClient().studio.count();
  }
}
```

- Return type is `Studio` **from `@st-manager/types`**, not either Prisma-generated client's own `Studio` type. Both generated clients' query results are structurally identical to `@st-manager/types`' `Studio` (same four fields, same primitive types), so this is a zero-cost type annotation — no runtime mapping needed here (the mapping to the *wire* shape happens later, in the controller, per §2).
- **Why a repository at all, for one model with three trivial calls:** it is the single, narrow place that has to deal with `PrismaService.getClient()`'s `DatabaseClient` union type (`PostgresPrismaClient | SqlitePrismaClient`). Isolating that concern here means `StudiosService`/`StudiosController` never need to know two different Prisma clients exist — and if a real complication with the union type surfaces (§13, the primary open risk of this plan), the fix is contained to this one file.
- No `$transaction` — `findMany`/`count` in `list()` are two independent queries (see §13 for the accepted consistency tradeoff this implies).

## 5. Prisma Usage

- Every call goes through `PrismaService.getClient()` (from M3, unmodified) — `StudiosRepository` never imports `@st-manager/database` directly, only through `PrismaService`.
- **`orderBy: { createdAt: "desc" }` is mandatory on `findMany`**, not optional polish: Prisma does not guarantee row order without an explicit `orderBy`, and a paginated list *must* have a stable order for `page=1`/`page=2` to be meaningful (otherwise the same row could appear on two pages, or never appear, across requests). This is called out explicitly so it isn't lost between planning and implementation.
- `skip`/`take` (not cursor-based pagination) — consistent with the simple `page`/`pageSize` contract already fixed in M4; cursor pagination would need a different `ListStudiosQueryDto` shape and is out of scope.
- No raw SQL, no `$queryRaw`, no `$transaction` in M5 — plain Prisma Client calls only, matching the "smallest vertical slice" principle the roadmap has used for every milestone so far.
- `PrismaService` itself is **not modified** in this plan's primary path (see §13 for the contingency if the union-type call doesn't typecheck cleanly).

## 6. Validation Flow

Completes the flow the M4 plan left half-built:

```
[SDK / curl]
      │ HTTP POST /studios { name } | GET /studios?page=&pageSize=
      ▼
[Nest ValidationPipe — new in M5]
  new ZodValidationPipe(createStudioSchema)        — for @Body()
  new ZodValidationPipe(listStudiosQuerySchema)     — for @Query()
  On success: returns the parsed (and, for the query, defaulted/coerced) value.
  On failure: throws BadRequestException with a structured payload (§7).
      ▼
StudiosController → StudiosService → StudiosRepository → PrismaService
```

`apps/api/src/common/pipes/zod-validation.pipe.ts`:

```ts
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Validation failed",
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
```

- One generic pipe class, instantiated per-parameter with the relevant schema — not a single global `app.useGlobalPipes(...)`, since each endpoint/parameter needs a different schema and Zod (unlike `class-validator`) has no per-DTO-class decorator metadata for Nest to discover automatically.
- Client-side validation (M4, in `packages/api-sdk`) and server-side validation (this pipe) intentionally run the **same** `createStudioSchema` — the client-side check is a UX/latency optimization only, never a trust boundary, exactly as designed in the M4 plan.

## 7. Error Handling

`apps/api/src/common/filters/http-exception.filter.ts` — a global, catch-all exception filter producing the `ApiErrorResponseDto` shape for **every** error response, not just validation failures:

```ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = exception instanceof HttpException ? exception.getStatus() : 500;
    const body: ApiErrorResponseDto = {
      statusCode,
      error: mapStatusToErrorCode(statusCode, exception),
      message: extractMessage(exception, statusCode),
      details: extractDetails(exception),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      this.logger.error(exception); // full detail server-side only
      body.message = "Internal server error"; // never leak internals to the client
    }

    response.status(statusCode).json(body);
  }
}
```

- **`@Catch()` with no argument** — catches everything, not just `HttpException` subclasses, so a genuinely unexpected error (e.g. a bug, a database driver throwing something unrelated to Nest) still produces a well-formed `ApiErrorResponseDto` with `statusCode: 500` instead of Nest's raw default error page/shape.
- `mapStatusToErrorCode` translates HTTP status → `API_ERROR_CODES` value: `400 → VALIDATION_ERROR`, `404 → NOT_FOUND`, anything else `≥500 → INTERNAL_ERROR`. **`NOT_FOUND` is wired but not exercised by any M5 endpoint** — Create and List have no natural 404 case; it's included now so the filter doesn't need revisiting the moment a single-resource `GET /studios/:id` is added later.
- `extractDetails` reads the `details` field the `ZodValidationPipe` attaches to `BadRequestException`'s response body (§6); for exceptions without one (e.g. a plain 500), `details` is simply omitted, matching `ApiErrorResponseDto.details` being optional.
- **500 errors are logged in full server-side, but the client-facing `message` is replaced with a generic string** — never leak stack traces or internal error text over the wire.
- Registered via the `APP_FILTER` DI token in `AppModule` (`{ provide: APP_FILTER, useClass: HttpExceptionFilter }`), not `app.useGlobalFilters(...)` in `main.ts` — the idiomatic Nest pattern, and keeps it dependency-injectable if it ever needs an injected service (e.g. a real logger, `packages/logging`, in M9).

## 8. API Routes

| Method | Path | Body/Query | Success | Failure |
|---|---|---|---|---|
| `POST` | `/studios` | Body: `CreateStudioDto` | `201 Created`, `StudioResponseDto` | `400` (`VALIDATION_ERROR`) |
| `GET` | `/studios` | Query: `ListStudiosQueryDto` | `200 OK`, `ListStudiosResponseDto` | `400` (`VALIDATION_ERROR`, malformed `page`/`pageSize`) |

No URL version prefix (`/v1/...`) — consistent with the M4 decision to keep versioning outside the contracts and roadmap precedent (`/health` also has none). Path segment sourced from `ROUTES.STUDIOS`, never a hardcoded string, in the controller.

## 9. Dependencies

No new third-party npm packages — everything needed (`PipeTransform`, `ExceptionFilter`, `HttpException`, `APP_FILTER`, `zod`, transitively) is already installed. Only new **workspace** dependency edges, all added to `apps/api/package.json`:

| Package | Why |
|---|---|
| `@st-manager/contracts` | `CreateStudioDto`, `StudioResponseDto`, `ListStudiosQueryDto`, `ListStudiosResponseDto`, `ApiErrorResponseDto` — not yet a dependency of `apps/api`. |
| `@st-manager/constants` | `ROUTES.STUDIOS`, `API_ERROR_CODES` — not yet a dependency of `apps/api`. |
| `@st-manager/types` | `Studio` — the domain type `StudiosService`/`StudiosRepository` operate on; not yet a dependency of `apps/api`. |

`@st-manager/database` and `@st-manager/validation` are already dependencies (M3). No change to `packages/database`, `packages/contracts`, or `packages/constants` themselves.

## 10. Files to Be Created

**`apps/api/src/common/`**
- `pipes/zod-validation.pipe.ts` — generic `ZodValidationPipe<T>` (§6).
- `filters/http-exception.filter.ts` — global `HttpExceptionFilter` (§7).

**`apps/api/src/modules/studios/`**
- `studios.module.ts` — wires `StudiosController`, `StudiosService`, `StudiosRepository`.
- `studios.controller.ts` — `POST`/`GET /studios` (§2).
- `studios.service.ts` — pagination + orchestration (§3).
- `studios.repository.ts` — the only `PrismaService.getClient()` call site for this resource (§4).
- `studios.mapper.ts` — `toStudioResponseDto(studio: Studio): StudioResponseDto`.

No new files anywhere outside `apps/api`.

## 11. Files to Be Modified

| File | Change |
|---|---|
| `apps/api/package.json` | Add `@st-manager/contracts`, `@st-manager/constants`, `@st-manager/types` dependencies. |
| `apps/api/src/app.module.ts` | Import `StudiosModule`; register `HttpExceptionFilter` via `{ provide: APP_FILTER, useClass: HttpExceptionFilter }`. |
| `packages/api-sdk/src/studios/studios.api.ts` | Remove the doc comment stating the endpoint "doesn't exist until M5" / "will fail with a network error" — no code change, since the function signatures were already written correctly in M4. |
| `packages/api-sdk/README.md` | Remove the "these calls will fail... by design" status caveat now that the endpoint is real. |
| `pnpm-lock.yaml` | Updated by `pnpm install` after the new dependency edges are declared. |

No changes to `packages/database`, `packages/contracts`, `packages/constants`, `packages/validation`, `apps/web`, or `apps/desktop`.

## 12. Validation Strategy

```bash
pnpm install
pnpm build
pnpm --filter @st-manager/api --filter @st-manager/contracts \
     --filter @st-manager/constants --filter @st-manager/types \
     --filter @st-manager/validation --filter @st-manager/database run typecheck
pnpm lint
```

Manual, real end-to-end verification (no automated test runner exists yet — consistent with M2/M3/M4 precedent):

1. Start `apps/api` in development mode (`pnpm --filter @st-manager/api run dev`) — selects the **SQLite** provider (M3 decision 6), the same database file M2 migrated and M3 already proved reachable from `apps/api`'s working directory.
2. `curl -X POST localhost:4000/studios -d '{"name":"Downtown Studio"}'` → expect `201` and a `StudioResponseDto` with string dates.
3. `curl -X POST localhost:4000/studios -d '{"name":""}'` → expect `400` with `error: "VALIDATION_ERROR"` and a populated `details` array.
4. `curl localhost:4000/studios` and `curl "localhost:4000/studios?page=1&pageSize=1"` → expect `200` with a correctly-paginated `ListStudiosResponseDto`, confirming `orderBy`/`skip`/`take` behave as designed against real, previously-inserted rows.
5. `curl "localhost:4000/studios?page=abc"` → expect `400` `VALIDATION_ERROR` (coercion failure), proving the query pipe rejects bad input the same way the body pipe does.
6. Re-run (an updated version of) the M4 SDK smoke test, but against this **real** running server instead of the `node:http` stub — closing the exact gap the M4 implementation report flagged in its Risks section ("re-run an equivalent check against the real endpoint once it exists").
7. Production-mode boot check (`NODE_ENV=production`, no live PostgreSQL, as already done in M3): confirm the app still boots and `POST`/`GET /studios` fail with a clean `ApiError`/`500` (connection refused) rather than crashing the process — proving the exception filter's catch-all path works for a real, unplanned failure mode, not just validation errors.

## 13. Risks

- **`PrismaService.getClient()`'s union return type (`PostgresPrismaClient | SqlitePrismaClient`) may not let TypeScript resolve `.studio.findMany(...)`/`.create(...)`/`.count(...)` cleanly**, since these are two independently-generated Prisma Client classes rather than one type parameterized by provider. This is the single largest open technical unknown in this plan, and cannot be fully resolved without compiling real code. **Contingency, decided now so implementation isn't blocked if it occurs:** `StudiosRepository` narrows with an explicit, documented, and narrowly-scoped type assertion (e.g. treating the returned client as the PostgreSQL-generated shape, which the SQLite-generated client is structurally compatible with for this model) at the single point where `.studio` is accessed — never anywhere else. If this contingency is needed, it will be called out explicitly in the M5 implementation report as a deviation from "no casts," not silently included.
- **No live PostgreSQL in this environment** (carried over from M2/M3) — §12 step 7 can prove the app *doesn't crash* in production mode, but cannot prove a real `Studio` row is ever created/read against PostgreSQL. This remains an open verification gap until a real Postgres instance (or CI) is available.
- **`findMany`/`count` are two separate, non-transactional queries.** Under concurrent writes between the two calls, `meta.total` could theoretically be off by a small amount relative to `data`. Accepted as a documented limitation for this milestone's traffic/consistency requirements rather than adding `$transaction` complexity; revisit if it ever causes a real, observed problem.
- **No automated tests exist yet** (M2/M3/M4 precedent). All validation in §12 is manual. Formal test coverage remains M13 scope.
- **The exception filter must be the true catch-all**, not just `@Catch(HttpException)` — an easy mistake that would silently regress M5's own goal (every error, including truly unexpected ones, must come back as `ApiErrorResponseDto`). Flagged explicitly so the implementation reviews this deliberately rather than defaulting to Nest's more common `@Catch(HttpException)` tutorial pattern.
- **`ListStudiosQueryDto`'s optional `page`/`pageSize` vs. the Zod-validated, always-defaulted values the service actually receives** is a minor type-precision gap noted in §3 — worth resolving cleanly at implementation time (e.g. a distinct internal type) rather than reaching for non-null assertions.

## 14. Future Extensibility

- **`GET /studios/:id`, `PATCH /studios/:id`, `DELETE /studios/:id`** — not in M5 (roadmap explicitly scopes M5 to Create + List). The layering in §1 (controller/service/repository/mapper) extends to these directly: new controller methods, new repository methods, no structural change.
- **`NOT_FOUND`** is already wired into the error-code mapping (§7) specifically so the first single-resource endpoint that needs it doesn't require touching the exception filter.
- **Auth (M10)**: `@UseGuards(...)` can be added to `StudiosController` methods individually (e.g. protect `create`, leave `list` open, per the roadmap's own open product question) without any change to the service/repository/mapper layers.
- **Additional resources** reuse every piece of shared infrastructure this milestone introduces: `ZodValidationPipe<T>` (generic over any Zod schema), `HttpExceptionFilter` (already resource-agnostic), and `PaginatedResponseDto<T>` (already generic, from M4) — a second resource module should need zero changes to `apps/api/src/common/`.
- **Desktop/web (M7/M8)** can now consume `packages/api-sdk`'s `createStudiosApi` against a real backend for the first time, unblocking the "smallest vertical slice" goal the roadmap has been building toward since M0.
- **`packages/logging` (M9)** is a natural fit to inject into `HttpExceptionFilter`'s constructor once it exists, replacing the plain `Logger` used for 500-level server-side logging in §7 — the `APP_FILTER`/DI-based registration chosen now (rather than `app.useGlobalFilters(...)`) is specifically what makes that swap possible without restructuring.

## 15. Next Step

This report is **planning only**. Awaiting approval of the layering (§1–§4), the validation/error-handling design (§6–§7), and the accepted risks (§13, especially the `PrismaService` union-type contingency) before any file in §10/§11 is created or modified.
