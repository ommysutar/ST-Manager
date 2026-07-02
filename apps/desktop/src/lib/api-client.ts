import { createHttpClient, createStudiosApi } from "@st-manager/api-sdk";

/**
 * In dev (`pnpm dev` / `tauri dev`), route API calls through the Vite dev
 * server origin so `/studios` is proxied to NestJS — avoiding browser CORS
 * without modifying `apps/api` (M7 scope). Production builds must set
 * `VITE_API_BASE_URL`.
 */
const baseUrl =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? window.location.origin : "http://localhost:4000");

const httpClient = createHttpClient({ baseUrl });

export const studiosApi = createStudiosApi(httpClient);
