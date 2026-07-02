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
   * Reserved for M10 (auth). Not called with anything meaningful yet — no
   * login flow or token store exists in M4.
   */
  getAuthHeaders?: () => Record<string, string> | undefined;
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
