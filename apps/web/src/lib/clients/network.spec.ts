import { ApiError } from "@st-manager/api-sdk";
import { API_ERROR_CODES } from "@st-manager/constants";
import { describe, expect, it } from "vitest";

import { isRetryableClientSyncFailure } from "./network";

describe("isRetryableClientSyncFailure", () => {
  it("queues network failures and 5xx", () => {
    expect(isRetryableClientSyncFailure(new Error("offline"))).toBe(true);
    expect(isRetryableClientSyncFailure(ApiError.networkError(new Error("dns")))).toBe(true);
    expect(
      isRetryableClientSyncFailure(
        new ApiError({
          success: false,
          statusCode: 503,
          error: API_ERROR_CODES.INTERNAL_ERROR,
          message: "unavailable",
          path: "/clients",
          timestamp: "2026-08-19T00:00:00.000Z",
        }),
      ),
    ).toBe(true);
  });

  it("does not queue validation or not-found errors", () => {
    expect(
      isRetryableClientSyncFailure(
        new ApiError({
          success: false,
          statusCode: 400,
          error: API_ERROR_CODES.VALIDATION_ERROR,
          message: "Invalid phone",
          path: "/clients",
          timestamp: "2026-08-19T00:00:00.000Z",
        }),
      ),
    ).toBe(false);
    expect(
      isRetryableClientSyncFailure(
        new ApiError({
          success: false,
          statusCode: 404,
          error: API_ERROR_CODES.NOT_FOUND,
          message: "missing",
          path: "/clients/1",
          timestamp: "2026-08-19T00:00:00.000Z",
        }),
      ),
    ).toBe(false);
  });
});
