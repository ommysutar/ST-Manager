/**
 * SDK configuration. `baseUrl` is always supplied by the caller — this
 * package never reads `process.env`/`import.meta.env` itself, since
 * `apps/web` (Next.js) and `apps/desktop` (Vite) use incompatible env-var
 * conventions and neither is wired up yet (M7/M8).
 */
export interface ApiClientConfig {
  baseUrl: string;
  /** Override for testing; defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /**
   * M10: returns Bearer token headers when the user is signed in.
   */
  getAuthHeaders?: () => Record<string, string> | undefined;
  /**
   * M10: called on 401 UNAUTHORIZED before giving up; return true to retry once.
   */
  onUnauthorized?: () => Promise<boolean>;
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * Minimal HTTP surface. Deliberately just `get`/`post` — no retry logic, no
 * caching, no interceptor pipeline (decision: keep the SDK minimal).
 */
export interface HttpClient {
  get<T>(path: string, query?: QueryParams): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}
