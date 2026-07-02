# @st-manager/contracts

API request/response shape definitions (DTOs) that keep `@st-manager/api` and `@st-manager/api-sdk` in sync. Defines shapes only — no HTTP client, no validation logic, no runtime code at all (every export is `export type`). Depends only on `@st-manager/types` (type-only), so it is safe for every app/package to depend on without pulling in unrelated runtime code, and never needs a CommonJS/ESM build fix since a type-only import is erased at compile time and never `require()`'d.

- `src/studio/` — `CreateStudioDto`, `StudioResponseDto`, `ListStudiosQueryDto`, `ListStudiosResponseDto`.
- `src/common/` — `PaginatedResponseDto<T>` / `PaginationMetaDto` (generic, reused by every future list endpoint) and `ApiErrorResponseDto` (shared error shape; see `docs/meeting-notes/M4-planning-report.md` and `docs/meeting-notes/M4-implementation-report.md`).

Status: initialized (M4). The Nest controller consuming these lands in M5.
