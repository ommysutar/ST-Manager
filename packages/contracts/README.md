# @st-manager/contracts

API request/response shape definitions (DTOs) that keep `@st-manager/api` and `@st-manager/api-sdk` in sync. Defines shapes only — no HTTP client, no validation logic, no runtime code at all (every export is `export type`). Depends only on `@st-manager/types` (type-only), so it is safe for every app/package to depend on without pulling in unrelated runtime code, and never needs a CommonJS/ESM build fix since a type-only import is erased at compile time and never `require()`'d.

- `src/studio/` — `CreateStudioDto`, `CreateStudioResponseDto`, `StudioResponseDto`, `ListStudiosQueryDto`, `ListStudiosResponseDto`.
- `src/common/` — `ApiSuccessResponseDto<T>` / `PaginatedResponseDto<T>` / `PaginationMetaDto` (generic success envelopes, reused by every future endpoint) and `ApiErrorResponseDto` (shared error shape).

Every `apps/api` response body is one of these three envelopes — a single resource is `{ success: true, data }` (`ApiSuccessResponseDto<T>` / `CreateStudioResponseDto`), a list is `{ success: true, data, meta }` (`PaginatedResponseDto<T>` / `ListStudiosResponseDto`), and every error is `{ success: false, statusCode, error, message, ... }` (`ApiErrorResponseDto`). `success` is the discriminant a caller can branch on first.

Status: implemented (M5). `apps/api`'s `StudiosController` (`POST`/`GET /studios`) is the first — and so far only — consumer.
