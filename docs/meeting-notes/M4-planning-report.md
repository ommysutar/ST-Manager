# M4 Planning Report — Studio Contracts and SDK Thread

- Date: 2026-07-02
- Milestone: M4 (Studio Contracts and SDK Thread)
- Source: [docs/roadmap/phase2-roadmap.md](../roadmap/phase2-roadmap.md), [M3 implementation report](./M3-implementation-report.md), `packages/types`, `packages/validation`, `packages/constants` (M1)
- Status: **Planning only — no application code has been generated.** Awaiting approval before implementation.

## 0. Recap: What Exists After M3

- `packages/types`: `Studio { id: string; name: string; createdAt: Date; updatedAt: Date }`.
- `packages/validation`: `createStudioSchema` (Zod) validating `{ name: string, 1–120 chars, trimmed }`, plus `apiEnvSchema` (M3, unrelated to this milestone).
- `packages/constants`: `ROUTES.STUDIOS = "studios"`, `PAGINATION.{DEFAULT_PAGE_SIZE: 20, MAX_PAGE_SIZE: 100}` — both already scaffolded in M1 specifically for this moment.
- `apps/api`: bootstrapped (M3), exposes only `GET /health`. `PrismaService.getClient()` exists but is unused by any route yet. **No `Studio` controller, service, or module exists.**
- `packages/contracts` and `packages/api-sdk`: still empty scaffolds — `package.json` (no `main`/`types`/`build`), `tsconfig.json`, `README.md` only. This is exactly what M4 fills in.
- Per the roadmap, M4's own definition of done is explicit: **`packages/api-sdk` builds and typechecks against `packages/contracts` with zero implementation of the actual endpoint** — the controller lands in M5. `apps/api` is therefore **not** touched in this milestone.

## 1. API Contracts

Two resource operations are contracted for `Studio`, matching M5's planned controller (`POST /studios`, `GET /studios`) even though that controller doesn't exist yet:

| Operation | Method | Path | Request | Response |
|---|---|---|---|---|
| Create Studio | `POST` | `/studios` | `CreateStudioDto` | `StudioResponseDto` |
| List Studios | `GET` | `/studios` | `ListStudiosQueryDto` (query string) | `ListStudiosResponseDto` |

Path segments are built from `ROUTES.STUDIOS` (`packages/constants`), not hardcoded strings, in both the future controller (M5) and the SDK (M4) — this is precisely why `ROUTES` was created in M1 ahead of either consumer existing.

A third, cross-cutting contract is added even though it isn't tied to Studio specifically: **`ApiErrorResponseDto`** (§6), because M4 is the first milestone where a real HTTP round-trip (with the possibility of a validation failure) is designed, and the SDK needs a concrete shape to parse error responses into.

## 2. Shared DTO Strategy

**Principle: `packages/contracts` is the single, dependency-light source of truth for wire shapes. Everything else (Zod schemas, SDK function signatures, and — in M5 — the Nest controller) is written to conform to it, not the other way around.**

Concretely:

- `packages/contracts` depends only on `@st-manager/types` (type-only), and defines its DTOs as plain TypeScript interfaces/types — no Zod, no runtime logic, no other workspace package. This keeps it the leaf-most contract package (mirroring how `packages/types` is already a zero-dependency leaf), safe for **every** consumer (`apps/api`, `apps/web`, `apps/desktop`, `packages/api-sdk`, `packages/validation`) to depend on without pulling in unrelated runtime code.
- `packages/validation`'s Zod schemas are written to **produce** contract-compatible types (e.g. `createStudioSchema`'s inferred output must be structurally assignable to `CreateStudioDto`). This makes `packages/validation` depend on `packages/contracts` (type-only), not the reverse. Rationale: Zod is an implementation detail of *how* a shape is validated; the contract shape itself should not be defined in terms of a specific validation library, so that contracts stay reusable even if a given schema is later reimplemented (e.g. a future `class-validator`-based path, or a different schema library) without changing the wire shape.
- `StudioResponseDto` is derived from `packages/types`' `Studio`, **not hand-duplicated**, with the two date fields overridden from `Date` to `string`:

  ```ts
  export interface StudioResponseDto extends Omit<Studio, "createdAt" | "updatedAt"> {
    createdAt: string; // ISO 8601 — Studio.createdAt serializes to a string over JSON/HTTP
    updatedAt: string; // ISO 8601
  }
  ```

  This date-type divergence is the most important, easy-to-miss detail in this milestone: `Studio.createdAt`/`updatedAt` are `Date` objects in `packages/types` (and in Prisma's generated client), but `JSON.stringify` (which Express/Nest use to serialize every response body) always turns a `Date` into an ISO string. Any DTO/type that claims a response body field is `Date` is lying about what actually arrives over the wire. `packages/contracts` is the one place this gets corrected once, for every consumer.
- `CreateStudioDto` mirrors `createStudioSchema`'s input shape (`{ name: string }`) but is declared independently in `packages/contracts` as the "official" request shape; `packages/validation`'s inferred `CreateStudioInput` type must match it (verified at the schema-definition call site — see §4).

## 3. SDK Architecture

`packages/api-sdk` is a small, framework-agnostic HTTP client — no Axios, no other HTTP library. It uses the native `fetch` global, which is available in Node 20 (this repo's pinned runtime), in every browser, and inside a Tauri webview, so it works unmodified across `apps/web` (Next.js, SSR + client) and `apps/desktop` (Tauri + Vite) without a polyfill.

Layered structure:

```
packages/api-sdk/src/
├── client/
│   ├── types.ts          # ApiClientConfig, HttpClient interface
│   ├── api-error.ts       # ApiError class (thrown on non-2xx / network failure)
│   └── http-client.ts     # createHttpClient(config): HttpClient — the fetch wrapper
├── studios/
│   └── studios.api.ts     # createStudiosApi(client): StudiosApi — listStudios/createStudio
└── index.ts               # public barrel export
```

Key design points:

- **No environment reads inside the SDK itself.** `apps/web` (Next.js, `NEXT_PUBLIC_*` vars) and `apps/desktop` (Vite, `import.meta.env.VITE_*`) have two different, incompatible env-var conventions, and neither is wired yet (that happens in M7/M8). The SDK never reads `process.env` or `import.meta.env` directly — `createHttpClient({ baseUrl, ... })` takes the base URL as an explicit parameter, and each app supplies it from whatever its own env mechanism is when M7/M8 wire it up. This mirrors the same "never read env directly" discipline M3 decision 3 established for `apps/api`, applied to the client side.
- **Auth is a placeholder, not implemented.** `ApiClientConfig` reserves an optional `getAuthHeaders?: () => Record<string, string> | undefined` hook so `createHttpClient` can merge auth headers into every request once M10 exists, without a breaking change to the client's shape later. It is not called with anything meaningful in M4 — no token store, no login flow exists yet.
- **Error normalization** (`api-error.ts`): any non-2xx response is parsed as `ApiErrorResponseDto` (§6) and thrown as an `ApiError` (extends `Error`, carries `statusCode`, `code`, `details`). Network failures (fetch rejecting, e.g. connection refused) are caught and re-thrown as an `ApiError` with a synthetic `statusCode: 0` / `code: "NETWORK_ERROR"`, so SDK consumers only ever need one `catch (err) { if (err instanceof ApiError) ... }` path, never a mix of `TypeError` (fetch) and thrown-object shapes.
- **Client-side pre-validation.** `createStudiosApi(client).createStudio(input)` runs `input` through `createStudioSchema.parse(...)` (from `packages/validation`) *before* issuing the request. This is a UX/latency optimization (fail fast, same error messages the server will eventually produce in M5) and a concrete reason `packages/validation`'s schema needs to already be contract-compatible (§2) — the SDK is the first real consumer that uses both `packages/contracts` (types) and `packages/validation` (runtime checks) together.
- **`apps/api` never imports `packages/api-sdk`** (already stated in the package's own README) — this is a one-directional, client-only package. Confirmed unchanged by this plan.

## 4. Validation Flow

End-to-end, once M5 also exists (M4 only implements the left two-thirds of this):

```
[apps/web / apps/desktop]
  createStudiosApi(client).createStudio({ name })
        │  (M4) createStudioSchema.parse(input) — client-side fail-fast
        ▼
  HTTP POST /studios  { name }
        ▼
[apps/api]  (M5, not built in M4)
  Nest ValidationPipe (Zod-based) — re-validates with the SAME createStudioSchema
  from @st-manager/validation, server-side. Client-side validation is a UX
  nicety, never a trust boundary — the server always re-validates.
        ▼
  StudiosController → StudiosService → PrismaService
        ▼
  201 Created, body: StudioResponseDto (serialized)
```

**M4 scope is the top of that diagram only**: the SDK's client-side `.parse()` call and the shared schema it depends on. The **Nest-side Zod validation pipe itself is explicitly deferred to M5** — a validation pipe with no controller to attach to is dead code, and M5 owns the controller per the roadmap. This report flags the intended pipe design now so M5 isn't starting from zero:

- A small generic `ZodValidationPipe` (implements Nest's `PipeTransform`) in `apps/api/src/common/pipes/`, constructed with any Zod schema (`new ZodValidationPipe(createStudioSchema)`), used via `@Body(new ZodValidationPipe(createStudioSchema))` or a param decorator on the M5 controller. On failure, it throws a Nest `BadRequestException` whose response body is shaped like `ApiErrorResponseDto` (§6) — which requires a matching exception filter, also deferred to M5.
- Query-string validation for `GET /studios` uses a new schema, `listStudiosQuerySchema` (§10), added to `packages/validation` in M4 (it's a schema, usable and testable independently of any controller — unlike the Nest pipe, there's no reason to defer writing it).

## 5. Request/Response Contracts

### `POST /studios`

Request body (`CreateStudioDto`):

```ts
export interface CreateStudioDto {
  name: string; // 1–120 chars, trimmed — enforced by createStudioSchema, both client- and (M5) server-side
}
```

Response body, `201 Created` (`StudioResponseDto`):

```ts
export interface StudioResponseDto {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### `GET /studios`

Query parameters (`ListStudiosQueryDto`, both optional):

```ts
export interface ListStudiosQueryDto {
  page?: number;     // default 1
  pageSize?: number; // default PAGINATION.DEFAULT_PAGE_SIZE (20), max PAGINATION.MAX_PAGE_SIZE (100)
}
```

Response body, `200 OK` (`ListStudiosResponseDto`) — a **paginated envelope**, not a bare array:

```ts
export interface PaginationMetaDto {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMetaDto;
}

export type ListStudiosResponseDto = PaginatedResponseDto<StudioResponseDto>;
```

**Why an envelope now, even though M5's first implementation could trivially return every row unpaginated:** `PAGINATION.DEFAULT_PAGE_SIZE`/`MAX_PAGE_SIZE` were deliberately added to `packages/constants` in M1 for this exact purpose. Shipping a bare-array response in M5 and then having to change every SDK caller and both frontends (M7/M8) to an envelope shape later is a breaking contract change; designing the envelope into the contract now (M4) costs nothing (M5 can legitimately implement it as "ignore pagination, return all rows with `meta.total = data.length`" as a first pass) and avoids that later break. `PaginatedResponseDto<T>` is generic so every future list endpoint (not just Studio) reuses it.

## 6. Error Model

A single, consistent error shape across every endpoint (not Studio-specific), because it needs to exist before *any* endpoint can fail validation:

```ts
export interface ApiErrorResponseDto {
  statusCode: number;  // HTTP status, e.g. 400, 404, 500
  error: string;       // short machine-readable slug, e.g. "VALIDATION_ERROR", "NOT_FOUND"
  message: string;     // human-readable summary, safe to display
  details?: unknown;   // e.g. an array of Zod issues for VALIDATION_ERROR; omitted otherwise
  path: string;        // request path that produced the error, e.g. "/studios"
  timestamp: string;   // ISO 8601, when the error was generated
}
```

- Lives in `packages/contracts/src/common/error-response.dto.ts` — deliberately under `common/`, not `studio/`, since it's shared by every future resource.
- **The DTO shape is M4 scope; the Nest global exception filter that actually *produces* this shape is M5 scope** (same reasoning as §4 — no endpoint exists yet to throw a real error from). M4's `ApiError` class (SDK-side, §3) is written against this DTO shape now, since the SDK needs to parse *something* — it will simply have nothing real to parse against until M5 lands the filter. This is called out explicitly as a coupling risk in §9.
- `ApiError` (SDK): `class ApiError extends Error { readonly statusCode: number; readonly code: string; readonly details?: unknown; }`, constructed from a parsed `ApiErrorResponseDto`. `code` is deliberately named differently from the DTO's `error` field to avoid shadowing `Error.name`/confusing the `error` word with the built-in `Error` type.

## 7. Versioning Strategy

Two distinct concerns, addressed separately because "versioning" is ambiguous:

**HTTP API versioning (URL/header-based endpoint versions, e.g. `/v1/studios`):** **not introduced in M4.** Routes stay unprefixed (`/studios`, matching M3's `/health`). Recommendation: defer URL versioning until the API has a consumer outside this monorepo's own apps (which are always deployed/updated together with the API right now, so there is no version-skew problem to solve yet). When it *is* needed, Nest's built-in URI versioning (`app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" })`) is the natural fit and requires no contract redesign — `packages/contracts` DTOs are already named by resource/operation (`CreateStudioDto`), not by version, so introducing `/v1/` later is a routing change, not a DTO change.

**Contract (DTO) evolution strategy:** since there's no version prefix yet, `packages/contracts` types must evolve **additively** until real versioning exists — add new optional fields, don't rename or remove existing ones, don't change a field's type in place (add a new field and deprecate the old one instead). This is a discipline convention to record now, not a mechanism to build.

**Package versioning (`package.json` `version` field):** unrelated to the above. `@st-manager/contracts` and `@st-manager/api-sdk` stay pinned at `"0.0.0"`, identical to every other workspace package — no independent semver policy for these two packages is introduced in M4. (`packages/api-sdk` is only consumed inside this monorepo via `workspace:*`, so npm-registry-style semver doesn't apply yet; revisit only if it's ever published externally.)

## 8. Dependencies

No new third-party npm packages. Only new **workspace** (`workspace:*`) dependency edges:

```
packages/types  (leaf, unchanged)
      ▲
packages/contracts   — new dep: @st-manager/types (type-only)
      ▲
packages/validation  — new dep: @st-manager/contracts (type-only)
      ▲                └── existing dep: zod (unchanged)
packages/api-sdk     — new deps: @st-manager/contracts, @st-manager/constants, @st-manager/validation
```

- `packages/contracts`: add `@st-manager/types` as a `dependency` (not devDependency — pnpm workspace linking needs it declared as a real dependency so downstream packages can resolve its re-exported types transitively).
- `packages/validation`: add `@st-manager/contracts` as a `dependency`.
- `packages/api-sdk`: add `@st-manager/contracts`, `@st-manager/constants`, `@st-manager/validation` as `dependencies`. No HTTP library dependency — native `fetch`.
- No new devDependencies anywhere (still just `typescript` per package, matching every other leaf package).
- `apps/api` is **not** modified — no new dependency there in M4.

## 9. Risks

- **`packages/contracts` must stay import-safe for `apps/api` (CommonJS) without needing the M3 CJS-output fix.** M3 discovered that `packages/database`/`packages/validation` had to be recompiled as CommonJS because their `dist/index.js` was `require()`'d at runtime by the CommonJS `apps/api`. `packages/contracts` avoids this class of problem entirely **by design**, as long as it stays types-only (no runtime `export const`/`export function`/`export class`): a `type`-only import compiles to nothing and is never `require()`'d at runtime, regardless of the target module format. This must be enforced by convention/review, not tooling — if a future change adds a real runtime export to `packages/contracts` (e.g. a helper function), it would need the same `module: "CommonJS"` override applied to it that `packages/database`/`packages/validation` already carry, or it will reproduce the exact M3 ESM/CJS crash the moment `apps/api` (in M5) imports it.
- **`packages/api-sdk` intentionally keeps the ESM build (`base.json` default)** — its only consumers (`apps/web`, `apps/desktop`, in M7/M8) are bundler-based (Next.js/Vite) and handle ESM natively (and prefer it). This is the opposite conclusion from the `packages/database`/`packages/validation` fix in M3, for the opposite reason (bundler consumers vs. plain-Node `require()` consumer) — noted explicitly so a future contributor doesn't "fix" it into CommonJS by copying the M3 pattern where it doesn't apply.
- **The error model (§6) and the Nest-side validation pipe (§4) are designed, not built, in M4.** Until M5 lands both, `ApiError`/`ApiErrorResponseDto` are unverified against any real error response — they can only be validated by typecheck and a manual mocked-HTTP smoke test (§12), not a live failing request. Flagged so M5's review explicitly re-verifies the SDK's error path against the real filter once it exists, not just the happy path.
- **No test runner exists in this repository yet** (consistent with M2/M3). SDK correctness (fetch wrapper, error normalization, pagination envelope parsing) is verified in M4 via typecheck plus a manual throwaway script against a tiny local HTTP stub (§12) — the same "throwaway script" pattern M2 used to verify the database layer. Formal automated tests are M13 scope per the roadmap, not pulled forward here.
- **Contract drift between `packages/validation`'s Zod output and `packages/contracts`' hand-written interfaces is possible if not checked at definition time.** Mitigated by writing each Zod schema's inferred type to be checked against the corresponding contract type at the schema's own definition site (e.g. a `satisfies`-style compile-time assertion), rather than relying on it only being caught incidentally wherever the type happens to be consumed. This must be applied when `listStudiosQuerySchema` is implemented, not deferred.
- **`ListStudiosQueryDto`'s `page`/`pageSize` arrive as strings over an actual HTTP query string** (`?page=2&pageSize=10`), not numbers — `listStudiosQuerySchema` must coerce (`z.coerce.number()`), same pattern M3 already used for `API_PORT` in `apiEnvSchema`. Flagged here so M5's controller wiring doesn't rediscover this from scratch.

## 10. Files to Be Created

**`packages/contracts/src/`**
- `studio/create-studio.dto.ts` — `CreateStudioDto`.
- `studio/studio-response.dto.ts` — `StudioResponseDto` (derived from `@st-manager/types`' `Studio`).
- `studio/list-studios.dto.ts` — `ListStudiosQueryDto`.
- `common/pagination.dto.ts` — `PaginationMetaDto`, `PaginatedResponseDto<T>`, and `ListStudiosResponseDto` (or colocated in `studio/list-studios.dto.ts` — final placement decided at implementation time).
- `common/error-response.dto.ts` — `ApiErrorResponseDto`.
- `index.ts` — barrel export of all of the above.

**`packages/validation/src/`**
- `studio/list-studios-query.schema.ts` — `listStudiosQuerySchema` (Zod, coerced `page`/`pageSize` with `PAGINATION` defaults/max) and its inferred `ListStudiosQueryInput` type, checked against `ListStudiosQueryDto`.

**`packages/api-sdk/src/`**
- `client/types.ts` — `ApiClientConfig`, `HttpClient` interface.
- `client/api-error.ts` — `ApiError` class.
- `client/http-client.ts` — `createHttpClient(config): HttpClient`.
- `studios/studios.api.ts` — `createStudiosApi(client): StudiosApi` (`listStudios`, `createStudio`).
- `index.ts` — public barrel export.

No files are created under `apps/api`, `apps/web`, or `apps/desktop` in M4.

## 11. Files to Be Modified

| File | Change |
|---|---|
| `packages/contracts/package.json` | Add `main`/`types` fields, `build`/`typecheck` scripts (matching `packages/types`' pattern), add `@st-manager/types` dependency. |
| `packages/contracts/README.md` | Replace "scaffolding only" status line with a description of the DTOs it now exports. |
| `packages/api-sdk/package.json` | Add `main`/`types` fields, `build`/`typecheck` scripts, add `@st-manager/contracts`/`@st-manager/constants`/`@st-manager/validation` dependencies. |
| `packages/api-sdk/README.md` | Replace "scaffolding only" status line with real usage documentation (`createHttpClient` + `createStudiosApi` example). |
| `packages/validation/package.json` | Add `@st-manager/contracts` dependency. |
| `packages/validation/src/index.ts` | Export `listStudiosQuerySchema` / `ListStudiosQueryInput`. |
| `packages/validation/src/studio/studio.schema.ts` | Update the doc comment (currently says "the API request/response DTOs ... will live in packages/contracts (M4)") to reflect that `packages/contracts` now exists, and note the `CreateStudioDto` compatibility. |
| `pnpm-lock.yaml` | Updated by `pnpm install` after the new workspace dependency edges are declared. |

No changes to `apps/api`, `apps/web`, `apps/desktop`, `packages/types`, `packages/database`, or `packages/constants`.

## 12. Validation Commands

```bash
# Link the new workspace dependency edges
pnpm install

# Build the packages in dependency order (turbo resolves this automatically)
pnpm --filter @st-manager/contracts --filter @st-manager/validation --filter @st-manager/api-sdk run build

# Typecheck exactly the packages this milestone touches (avoids the pre-existing,
# unrelated empty-src TS18003 failures in apps/web, apps/desktop, packages/storage —
# see the M2/M3 reports)
pnpm --filter @st-manager/contracts --filter @st-manager/validation --filter @st-manager/api-sdk run typecheck

# Full workspace build + lint, to confirm nothing else regressed
pnpm build
pnpm lint

# Manual smoke test (no automated test runner exists yet — see §9):
# start a tiny node:http stub server returning canned CreateStudioDto/ListStudiosResponseDto/
# ApiErrorResponseDto JSON, point createHttpClient({ baseUrl: "http://localhost:<port>" }) at
# it, and confirm createStudiosApi(client).createStudio(...) / .listStudios(...) parse
# successfully, and that a canned 400 response is correctly thrown as an ApiError with the
# expected statusCode/code/details.
```

## 13. Next Step

This report is **planning only**. Awaiting approval of the design in §1–§7 (DTO shapes, dependency direction, pagination envelope, error model, deferred-to-M5 boundaries) before any file in §10/§11 is created or modified.
