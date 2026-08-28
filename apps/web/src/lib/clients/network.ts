import { ApiError } from "@st-manager/api-sdk";
import { API_ERROR_CODES } from "@st-manager/constants";

/** Browser online flag. SSR / tests without navigator default to online. */
export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }
  return navigator.onLine;
}

/**
 * Failures that should stay in the offline create queue.
 * Validation / auth / not-found must not be queued (they would retry forever).
 */
export function isRetryableClientSyncFailure(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return true;
  }

  if (error.statusCode === 0 || error.code === API_ERROR_CODES.NETWORK_ERROR) {
    return true;
  }

  if (error.statusCode === 408 || error.statusCode === 429) {
    return true;
  }

  return error.statusCode >= 500;
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(ApiError.networkError(new Error("Request timed out")));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
