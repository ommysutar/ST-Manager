"use client";

import { createHttpClient, createStudiosApi } from "@st-manager/api-sdk";

/**
 * In dev, route API calls through the Next.js origin (`/api/*` rewrites) so
 * requests are forwarded to NestJS without modifying `apps/api` (M8 scope).
 * Production builds must set `NEXT_PUBLIC_API_BASE_URL`.
 */
const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "development"
    ? typeof window !== "undefined"
      ? `${window.location.origin}/api`
      : "http://localhost:3000/api"
    : "http://localhost:4000");

const httpClient = createHttpClient({ baseUrl });

export const studiosApi = createStudiosApi(httpClient);
