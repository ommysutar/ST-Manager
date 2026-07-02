/**
 * Canonical API error codes, shared by `apps/api` (producer, from M5 onward)
 * and `packages/api-sdk` (consumer). Kept here — not in `packages/contracts`
 * — so the error-response *shape* (`ApiErrorResponseDto.error: string`) stays
 * dependency-free while the actual *values* have one source of truth.
 */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  /** Thrown by packages/api-sdk when a request never reaches the server. */
  NETWORK_ERROR: "NETWORK_ERROR",
  /** Thrown by packages/api-sdk when an error response doesn't match ApiErrorResponseDto. */
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
