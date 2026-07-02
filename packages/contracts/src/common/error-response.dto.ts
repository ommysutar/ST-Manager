/**
 * Shared error response shape, produced by `apps/api` (a global exception
 * filter, from M5 onward) and consumed by `packages/api-sdk`'s `ApiError`.
 *
 * `error` is typed as a plain `string`, not the `ApiErrorCode` union from
 * `@st-manager/constants` — this package stays dependency-free except for
 * `@st-manager/types`, so it cannot import from `@st-manager/constants`.
 * Producers and consumers should use `API_ERROR_CODES` from
 * `@st-manager/constants` as the canonical set of values for this field.
 */
export interface ApiErrorResponseDto {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
}
