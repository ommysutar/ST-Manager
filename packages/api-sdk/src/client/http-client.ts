import { API_ERROR_CODES } from "@st-manager/constants";
import type { ApiErrorResponseDto } from "@st-manager/contracts";

import { ApiError } from "./api-error";
import type { ApiClientConfig, HttpClient, QueryParams } from "./types";

function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedPath = path.replace(/^\/+/, "");
  const url = new URL(`${trimmedBase}/${trimmedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorResponseDto>;

  try {
    body = (await response.json()) as Partial<ApiErrorResponseDto>;
  } catch {
    return ApiError.unknownError(response);
  }

  if (typeof body.message !== "string" || typeof body.error !== "string") {
    return ApiError.unknownError(response);
  }

  return new ApiError({
    success: false,
    statusCode: body.statusCode ?? response.status,
    error: body.error,
    message: body.message,
    details: body.details,
    path: body.path ?? "",
    timestamp: body.timestamp ?? new Date().toISOString(),
  });
}

/**
 * Creates a minimal `HttpClient` backed by native `fetch` — no third-party
 * HTTP library, no retry logic, no caching (decision: keep the SDK minimal
 * and framework-agnostic). Works unmodified in Node 20+, every browser, and
 * a Tauri webview.
 */
export function createHttpClient(config: ApiClientConfig): HttpClient {
  const fetchImpl = config.fetch ?? fetch;

  async function request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: { query?: QueryParams; body?: unknown; allowRetry?: boolean } = {},
  ): Promise<T> {
    const url = buildUrl(config.baseUrl, path, options.query);
    const hasBody = options.body !== undefined;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(config.getAuthHeaders?.() ?? {}),
    };

    let response: Response;

    try {
      response = await fetchImpl(url, {
        method,
        headers,
        body: hasBody ? JSON.stringify(options.body) : undefined,
      });
    } catch (cause) {
      throw ApiError.networkError(cause);
    }

    if (!response.ok) {
      const error = await parseErrorResponse(response);

      if (
        options.allowRetry !== false &&
        response.status === 401 &&
        error.code === API_ERROR_CODES.UNAUTHORIZED &&
        config.onUnauthorized
      ) {
        const shouldRetry = await config.onUnauthorized();
        if (shouldRetry) {
          return request<T>(method, path, { ...options, allowRetry: false });
        }
      }

      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  return {
    get: (path, query) => request("GET", path, { query }),
    post: (path, body) => request("POST", path, { body }),
    patch: (path, body) => request("PATCH", path, { body }),
    delete: (path) => request("DELETE", path),
  };
}
