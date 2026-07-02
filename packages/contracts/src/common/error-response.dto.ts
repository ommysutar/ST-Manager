/**
 * Shared error response shape, produced by `apps/api`'s global
 * `HttpExceptionFilter` (M5) and consumed by `packages/api-sdk`'s
 * `ApiError`.
 *
 * `success: false` is the discriminant that pairs this with
 * `ApiSuccessResponseDto`/`PaginatedResponseDto` (M5 decision: "standardize
 * API responses") — a caller can branch on `body.success` before looking at
 * anything else.
 *
 * `error` is typed as a plain `string`, not the `ApiErrorCode` union from
 * `@st-manager/constants` — this package stays dependency-free except for
 * `@st-manager/types`, so it cannot import from `@st-manager/constants`.
 * Producers and consumers should use `API_ERROR_CODES` from
 * `@st-manager/constants` as the canonical set of values for this field.
 */
export interface ApiErrorResponseDto {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
}
