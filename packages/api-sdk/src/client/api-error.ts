import { API_ERROR_CODES } from "@st-manager/constants";
import type { ApiErrorResponseDto } from "@st-manager/contracts";

/**
 * The single error type every `packages/api-sdk` call can throw — network
 * failures and non-2xx HTTP responses are both normalized into this shape,
 * so consumers never need to distinguish a thrown `TypeError` (fetch) from
 * a parsed error body.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(response: ApiErrorResponseDto) {
    super(response.message);
    this.name = "ApiError";
    this.statusCode = response.statusCode;
    this.code = response.error;
    this.details = response.details;
  }

  /** The request never reached the server (offline, DNS failure, refused connection, ...). */
  static networkError(cause: unknown): ApiError {
    return new ApiError({
      success: false,
      statusCode: 0,
      error: API_ERROR_CODES.NETWORK_ERROR,
      message: cause instanceof Error ? cause.message : "Network request failed",
      path: "",
      timestamp: new Date().toISOString(),
    });
  }

  /** The server responded with a non-2xx status, but the body didn't match ApiErrorResponseDto. */
  static unknownError(response: Response): ApiError {
    return new ApiError({
      success: false,
      statusCode: response.status,
      error: API_ERROR_CODES.UNKNOWN_ERROR,
      message: response.statusText || "Request failed",
      path: "",
      timestamp: new Date().toISOString(),
    });
  }
}
