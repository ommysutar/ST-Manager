# M4 Implementation Report — Studio Contracts and SDK Thread

- Status: Implemented, validated, **not committed** (awaiting review per instructions)
- Base: M3 (NestJS API Bootstrap), uncommitted in the same working tree
- Date: 2026-07-02
- Scope: `packages/contracts`, `packages/validation` (additive), `packages/api-sdk`, `packages/constants` (additive). No `apps/api`/`apps/web`/`apps/desktop` changes.

## 1. Executive Summary

`packages/contracts` and `packages/api-sdk` are now real, typed packages instead of empty scaffolds. `packages/contracts` defines the `Studio` request/response/list/error DTOs as dependency-light plain TypeScript types (only `@st-manager/types`, type-only). `packages/api-sdk` is a minimal, framework-agnostic `fetch`-based HTTP client exposing `createStudiosApi().{listStudios, createStudio}`, with no retry logic and no caching. `packages/validation` gained a `listStudiosQuerySchema` and now checks both of its Studio schemas against the `packages/contracts` shapes at their definition sites. `packages/constants` gained `API_ERROR_CODES`, the canonical set of error-code values used by the (dependency-free) `ApiErrorResponseDto` shape.

All seven refinements from the approval message were applied exactly as specified (§7 confirms each). Everything builds, typechecks, and lints cleanly, and the SDK's logic — including client-side validation, server-error normalization, a malformed-error-body fallback, and network-failure handling — was verified end-to-end against a real local HTTP server (§8.4), since no automated test runner exists in this repository yet.

## 2. Files Created

**`packages/contracts/src/`**
- `studio/create-studio.dto.ts` — `CreateStudioDto`.
- `studio/studio-response.dto.ts` — `StudioResponseDto` (derived from `@st-manager/types`' `Studio`, with `createdAt`/`updatedAt` corrected from `Date` to `string`).
- `studio/list-studios.dto.ts` — `ListStudiosQueryDto`, `ListStudiosResponseDto`.
- `common/pagination.dto.ts` — `PaginationMetaDto`, generic `PaginatedResponseDto<T>`.
- `common/error-response.dto.ts` — `ApiErrorResponseDto`.
- `index.ts` — barrel export (all `export type`, nothing runtime).

**`packages/validation/src/`**
- `studio/list-studios-query.schema.ts` — `listStudiosQuerySchema` (Zod, `page`/`pageSize` coerced from query-string values, defaulted from `PAGINATION`), `ListStudiosQueryInput`.

**`packages/api-sdk/src/`**
- `client/types.ts` — `ApiClientConfig`, `QueryParams`, `HttpClient`.
- `client/api-error.ts` — `ApiError` class, with `ApiError.networkError()` and `ApiError.unknownError()` factory statics.
- `client/http-client.ts` — `createHttpClient(config): HttpClient` (native `fetch`, no retry/caching).
- `studios/studios.api.ts` — `createStudiosApi(client): StudiosApi` (`listStudios`, `createStudio`).
- `index.ts` — public barrel export.

**`packages/constants/src/`**
- `errors.ts` — `API_ERROR_CODES` (`VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`, `NETWORK_ERROR`, `UNKNOWN_ERROR`), `ApiErrorCode` type.

No files were created under `apps/api`, `apps/web`, or `apps/desktop`.

## 3. Files Modified

| File | Change | Why |
|---|---|---|
| `packages/constants/src/index.ts` | Export `./errors` | Expose `API_ERROR_CODES`. |
| `packages/contracts/package.json` | Add `main`/`types`, `build` script, `@st-manager/types` dependency | Turn the scaffold into a real, buildable package. |
| `packages/contracts/README.md` | Replace "scaffolding only" status with real contents description | Keep docs accurate. |
| `packages/validation/package.json` | Add `@st-manager/contracts` dependency | `createStudioSchema`/`listStudiosQuerySchema` are checked against contract types. |
| `packages/validation/src/index.ts` | Export `listStudiosQuerySchema`/`ListStudiosQueryInput` | Make the new schema public. |
| `packages/validation/src/studio/studio.schema.ts` | Import `CreateStudioDto`; add a compile-time compatibility check (`const _contractCheck: CreateStudioDto = {} as CreateStudioInput`); update doc comment | `packages/contracts` now exists — verify (and document) that the schema's output stays contract-compatible, at the schema's own definition site rather than only incidentally at usage sites. |
| `packages/api-sdk/package.json` | Add `main`/`types`, `build` script, `@st-manager/contracts`/`@st-manager/constants`/`@st-manager/validation` dependencies | Turn the scaffold into a real, buildable package. |
| `packages/api-sdk/tsconfig.json` | Add `"lib": ["ES2022", "DOM"]` | See §5 — `fetch`/`URL`/`Response`/`Headers` are DOM-lib ambient types; without this the package fails to compile. Scoped to this package only. |
| `packages/api-sdk/README.md` | Replace "scaffolding only" status with usage example | Keep docs accurate. |
| `pnpm-lock.yaml` | Updated by `pnpm install` | New workspace dependency edges. |

No changes to `apps/api`, `apps/web`, `apps/desktop`, `packages/types`, or `packages/database` beyond what M3 already made (untouched here).

## 4. Dependencies Added

Only new **workspace** (`workspace:*`) edges — no third-party npm packages:

```
packages/types (leaf, unchanged)
      ▲
packages/contracts    — new: @st-manager/types (type-only)
      ▲
packages/validation   — new: @st-manager/contracts (type-only)
      ▲                 existing: zod (unchanged)
packages/api-sdk      — new: @st-manager/contracts, @st-manager/constants, @st-manager/validation
```

- `packages/contracts`: `@st-manager/types` (dependency, type-only usage).
- `packages/validation`: `@st-manager/contracts` (dependency, type-only usage).
- `packages/api-sdk`: `@st-manager/contracts` (types), `@st-manager/constants` (`ROUTES`, `API_ERROR_CODES`), `@st-manager/validation` (runtime — `createStudioSchema.parse()`).
- No HTTP client library (Axios, ky, etc.) — native `fetch`, as required.
- No devDependencies added beyond what every package already had (`typescript`).

## 5. Issue Found and Fixed During Implementation

**`packages/api-sdk` failed to compile: `Cannot find name 'fetch' | 'URL' | 'Response'`.**

`packages/api-sdk`'s `tsconfig.json` inherited `base.json`'s `"lib": ["ES2022"]`, which does not include the Web/DOM ambient type declarations (`fetch`, `URL`, `Response`, `Headers`) that `client/http-client.ts` and `client/api-error.ts` reference. This is expected — `lib: ["ES2022"]` alone assumes a plain ECMAScript runtime with no host APIs. Since this package must compile against the *type signature* of `fetch` (a Web API, standardized identically across Node 20+, every browser, and Tauri's webview) without assuming any one specific runtime's own type package (e.g. not `@types/node`, which would tie it conceptually to Node even though it also has to run in browsers), the correct fix is to add the standard `"DOM"` lib entry, which provides these ambient types portably. Fixed by adding `"lib": ["ES2022", "DOM"]` to `packages/api-sdk/tsconfig.json` only — not to the shared `base.json` preset, since other packages (e.g. `packages/database`, a Node-only package) have no reason to carry browser-only ambient types.

This is unrelated to the M3 ESM/CommonJS defect — that was a *module format* issue (how compiled output is `require()`'d); this is a *type declaration* issue (which ambient globals `tsc` knows about). Both are tsconfig-level fixes but address different problems.

## 6. Notable Implementation Decisions

- **`packages/contracts` exports only `export type` — zero runtime code.** Confirmed by inspecting the compiled `dist/` output: every emitted `.js` file is an empty module (`export {};`). This is what makes the "no CJS/ESM fix needed" claim from the M4 plan concretely true: a type-only export is erased entirely at compile time, so nothing is ever `require()`'d or `import()`'d at runtime, regardless of which module format `apps/api` (CommonJS) or a bundler consumer expects.
- **Contract-compatibility checks are a simple `const _x: ContractType = {} as SchemaInputType` assertion**, not a `satisfies`-based Zod generic (which gets awkward with Zod v4's schema generics for object types with defaults). This is a plain, unambiguous compile-time check: if `CreateStudioInput`/`ListStudiosQueryInput` ever drift from being structurally assignable to `CreateStudioDto`/`ListStudiosQueryDto`, `tsc` fails at the schema's own definition site. The `_`-prefixed name means neither TypeScript (`noUnusedLocals` is off) nor ESLint (`varsIgnorePattern: "^_"`, already configured in M0) flags it as unused.
- **`ApiError` has two named factory statics** (`networkError`, `unknownError`) rather than a single catch-all constructor path, so the SDK's own code reads clearly at each call site about *why* a given `ApiError` was constructed (request never left the client vs. server responded but not in the expected shape), while still funneling every failure through the same class for consumers.
- **`API_ERROR_CODES` includes `UNKNOWN_ERROR`**, not originally listed in the M4 plan's four codes (`VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`, `NETWORK_ERROR`). Added during implementation because `parseErrorResponse` needs a code for the case where a non-2xx response body doesn't parse as JSON, or doesn't contain the required `ApiErrorResponseDto` fields (`message`, `error`) — a real case exercised in the smoke test (§8.4) against a deliberately non-JSON error body.
- **`buildUrl` normalizes slashes explicitly** (strips a trailing slash from `baseUrl`, a leading slash from `path`, joins with exactly one `/`) rather than relying on `new URL(path, base)`'s relative-resolution semantics, which silently do the wrong thing when `path` starts with `/` and `baseUrl` has its own path segment. `ROUTES.STUDIOS` (`"studios"`, no leading slash) is passed as-is from `studios.api.ts`.
- **`PaginatedResponseDto<T>` kept the `Dto` suffix** (not renamed to bare `PaginatedResponse`) for naming consistency with every other type in `packages/contracts` (`CreateStudioDto`, `StudioResponseDto`, etc.) — the approval's "keep PaginatedResponse generic" was read as confirming the generic-shape decision from the plan, not mandating a literal rename.

## 7. Confirmation of Each Requested Refinement

1. **No Swagger/OpenAPI** — confirmed; not added, not referenced anywhere.
2. **SDK stays minimal — no retry logic, no caching** — confirmed. `createHttpClient` issues exactly one `fetch` call per method call, with no retry/backoff and no response caching of any kind.
3. **API error codes moved into `packages/constants`** — done: `API_ERROR_CODES`/`ApiErrorCode` live in `packages/constants/src/errors.ts`. `ApiErrorResponseDto.error` (in `packages/contracts`) stays a plain `string` — it cannot import `ApiErrorCode` without violating refinement 5 — with a doc comment pointing producers/consumers at `API_ERROR_CODES` as the canonical value set.
4. **`PaginatedResponse` kept generic** — done: `PaginatedResponseDto<T>` in `packages/contracts/src/common/pagination.dto.ts`, parameterized, reused by `ListStudiosResponseDto` and available to every future list endpoint.
5. **`packages/contracts` dependency-free except `@st-manager/types`** — done and verified: `packages/contracts/package.json`'s only `dependency` is `@st-manager/types`; no `zod`, no `@st-manager/constants`, no `@st-manager/validation`.
6. **`packages/api-sdk` framework-agnostic, native `fetch()`** — done: no HTTP library dependency exists anywhere in `packages/api-sdk/package.json`; `client/http-client.ts` calls the global `fetch` (or an injected override, for testing) directly.
7. **Frozen architecture unchanged** — no new packages/apps/folders; the only tsconfig changes (`packages/api-sdk`'s `lib` addition) are compiler-configuration fixes, not architecture changes, and are called out explicitly in §5 rather than folded in silently.

## 8. Validation

### 8.1 Install / build

```bash
pnpm install   # links the new workspace dependency edges
pnpm build      # 8/8 tasks successful (turbo), includes packages/contracts and packages/api-sdk
```

### 8.2 Typecheck (all M4-touched packages, plus downstream consumers)

```bash
pnpm --filter @st-manager/constants --filter @st-manager/contracts \
     --filter @st-manager/validation --filter @st-manager/api-sdk \
     --filter @st-manager/api --filter @st-manager/database run typecheck
```

All six: `Done`, 0 errors — including `@st-manager/api` and `@st-manager/database`, confirming M3's work is unaffected by M4's changes.

### 8.3 Lint

```bash
pnpm lint   # 0 errors, 0 warnings, full workspace
```

### 8.4 Manual SDK smoke test (no automated test runner exists yet — see M2/M3 precedent)

A throwaway script (not committed) started a real local `node:http` server and exercised `createHttpClient`/`createStudiosApi` against it over an actual HTTP round-trip — not typecheck alone:

```
PASS - createStudio returns StudioResponseDto
PASS - listStudios returns paginated envelope
PASS - createStudio rejects empty name client-side (ZodError)
PASS - server validation error normalized to ApiError
PASS - non-JSON error body normalized to UNKNOWN_ERROR
PASS - connection failure normalized to NETWORK_ERROR

ALL CHECKS PASSED
```

Specifically verified:
1. **Happy path `createStudio`** — posts `{ name }`, receives `201` with a `StudioResponseDto` whose `createdAt`/`updatedAt` are strings (not `Date` objects), confirming §2's date-serialization design decision holds in practice.
2. **Happy path `listStudios`** — receives the paginated envelope (`{ data, meta }`) and reads `meta.page`/`meta.total` correctly.
3. **Client-side validation** — `createStudio({ name: "" })` throws a Zod error *before* any network request is made (verified by never hitting the stub server's assertion path for this case).
4. **Server-side error normalization** — a `400` response shaped like `ApiErrorResponseDto` is correctly thrown as an `ApiError` with `statusCode: 400` and `code: "VALIDATION_ERROR"`.
5. **Malformed error body fallback** — a `400` response with a non-JSON, non-`ApiErrorResponseDto`-shaped body is correctly caught and normalized to `ApiError` with `code: "UNKNOWN_ERROR"`, rather than throwing an unhandled parse exception.
6. **Network failure** — a request to an unreachable host (`http://localhost:1`) is correctly normalized to `ApiError` with `code: "NETWORK_ERROR"`, rather than an unhandled `TypeError` from `fetch` leaking to the caller.

The script imported directly from `packages/api-sdk/src/index.ts` (via `tsx`, which resolves TypeScript's `bundler`-style extensionless relative imports) rather than the compiled `dist/` output, because running compiled ESM output directly under plain Node's strict ESM loader reproduces the exact extensionless-import resolution error M3 already documented for the *build* format `packages/api-sdk` deliberately keeps (§9 of the M4 plan predicted this and explained why `packages/api-sdk` should **not** get the M3 CommonJS fix — its real consumers are bundlers, which resolve extensionless imports the same way `tsx` does). This is expected and is not a defect in the shipped package.

### 8.5 Root `pnpm typecheck`

Still fails — but the failing set no longer includes anything M4 touched. Full current list of pre-existing, unrelated empty-`src/` (`TS18003`) packages: `apps/web`, `apps/desktop`, `packages/storage`, `packages/logging`, `packages/ai`, `packages/ui`, `packages/events`, `packages/theme`. `packages/contracts` and `packages/api-sdk` are **no longer** in this list — M4 is the milestone that gave them real content and resolved their instance of this pre-existing condition.

## 9. Risks and Remaining Issues

- **No automated test runner exists yet.** SDK correctness is verified via typecheck plus the manual smoke test in §8.4, consistent with M2/M3 precedent. Formalizing this (M13, per the roadmap) would let §8.4's script become a real regression test instead of a one-off manual run.
- **The SDK's `createStudiosApi` calls have no real endpoint to hit yet** — `/studios` doesn't exist in `apps/api` until M5. §8.4 proves the SDK's own logic (request construction, validation, error normalization) is correct against a stand-in server, but not against the real Nest controller/exception filter, which don't exist yet. M5's review should re-run an equivalent check against the real endpoint once it exists, particularly the error path, since the real exception filter's exact output shape is only designed (not built) as of this milestone.
- **`packages/contracts` staying dependency-free is a convention, not an enforced constraint.** Nothing currently prevents a future change from adding a runtime dependency or a non-type export to `packages/contracts`; if that ever happens, it would both violate refinement 5 and reintroduce the CJS/ESM risk described in §6 of the M4 plan. Worth a lint rule or code-review checklist item if this becomes a recurring concern.
- **`packages/api-sdk`'s `lib: ["ES2022", "DOM"]` also pulls in unrelated DOM ambient types** (e.g. `document`, `window`) that this package doesn't use and shouldn't reference — `tsc` won't stop a future contributor from accidentally using one inside `packages/api-sdk` (it would still fail at runtime in Node, since `document`/`window` don't exist there). Not fixed now — no cheap way to include just `fetch`/`URL`/`Response` from `lib.dom.d.ts` without pulling in the whole file — but worth a code-review note.

## 10. Next Recommended Milestone

**M5 — Studio API Feature Module**, per the roadmap: `apps/api/src/modules/studios` (controller for `POST`/`GET /studios`, service using `PrismaService`), the Zod `ValidationPipe` and global exception filter this milestone deliberately deferred (§4 of the M4 plan), and re-pointing `packages/api-sdk`'s calls at the real endpoint (removing the "no endpoint exists yet" caveat from its README).

Stopping here per instructions — no commit has been made. `git status` shows all M3 and M4 changes as modified/untracked.
