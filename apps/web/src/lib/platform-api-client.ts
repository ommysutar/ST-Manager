"use client";

import { createHttpClient, createPlatformAdminApi } from "@st-manager/api-sdk";

import { platformTokenStore } from "./platform-token-store";

const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "development"
    ? typeof window !== "undefined"
      ? `${window.location.origin}/api`
      : "http://localhost:3000/api"
    : "http://localhost:4000");

const platformHttpClient = createHttpClient({
  baseUrl,
  getAuthHeaders: () => {
    const accessToken = platformTokenStore.getAccessToken();
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
  },
  onUnauthorized: async () => {
    platformTokenStore.clear();
    return false;
  },
});

export const platformAdminApi = createPlatformAdminApi(platformHttpClient);
