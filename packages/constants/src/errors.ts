/**
 * Canonical API error codes, shared by `apps/api` (producer, from M5 onward)
 * and `packages/api-sdk` (consumer). Kept here — not in `packages/contracts`
 * — so the error-response *shape* (`ApiErrorResponseDto.error: string`) stays
 * dependency-free while the actual *values* have one source of truth.
 */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  BOOKING_CONFLICT: "BOOKING_CONFLICT",
  SLOT_CONFLICT: "SLOT_CONFLICT",
  SESSION_INVALID_TRANSITION: "SESSION_INVALID_TRANSITION",
  SESSION_BOOKING_ALREADY_LINKED: "SESSION_BOOKING_ALREADY_LINKED",
  INVOICE_INVALID_TRANSITION: "INVOICE_INVALID_TRANSITION",
  INVOICE_SESSION_ALREADY_LINKED: "INVOICE_SESSION_ALREADY_LINKED",
  AI_PROVIDER_ERROR: "AI_PROVIDER_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  /** Thrown by packages/api-sdk when a request never reaches the server. */
  NETWORK_ERROR: "NETWORK_ERROR",
  /** Thrown by packages/api-sdk when an error response doesn't match ApiErrorResponseDto. */
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
