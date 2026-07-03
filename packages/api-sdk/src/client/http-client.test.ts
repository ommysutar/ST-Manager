import { API_ERROR_CODES } from "@st-manager/constants";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "./api-error";
import { createHttpClient } from "./http-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createHttpClient", () => {
  it("returns parsed JSON on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, data: [{ id: "1", name: "Studio" }] }),
    );

    const client = createHttpClient({
      baseUrl: "http://localhost:4000",
      fetch: fetchImpl,
    });

    const result = await client.get<{ success: true; data: unknown[] }>("studios");

    expect(result.data).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:4000/studios",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("throws ApiError for structured validation failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          success: false,
          statusCode: 400,
          error: API_ERROR_CODES.VALIDATION_ERROR,
          message: "Validation failed",
          path: "/studios",
          timestamp: new Date().toISOString(),
        },
        400,
      ),
    );

    const client = createHttpClient({
      baseUrl: "http://localhost:4000",
      fetch: fetchImpl,
    });

    await expect(client.post("studios", { name: "" })).rejects.toMatchObject({
      name: "ApiError",
      statusCode: 400,
      code: API_ERROR_CODES.VALIDATION_ERROR,
    });
  });

  it("wraps network failures as ApiError", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const client = createHttpClient({
      baseUrl: "http://localhost:4000",
      fetch: fetchImpl,
    });

    await expect(client.get("studios")).rejects.toBeInstanceOf(ApiError);
  });
});
