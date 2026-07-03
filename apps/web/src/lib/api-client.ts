"use client";

import { createAuthApi, createHttpClient, createStudiosApi, type AuthApi } from "@st-manager/api-sdk";

import { tokenStore } from "./token-store";

const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "development"
    ? typeof window !== "undefined"
      ? `${window.location.origin}/api`
      : "http://localhost:3000/api"
    : "http://localhost:4000");

const authApiRef: { current: AuthApi | null } = { current: null };

const httpClient = createHttpClient({
  baseUrl,
  getAuthHeaders: () => {
    const accessToken = tokenStore.getAccessToken();
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
  },
  onUnauthorized: async () => {
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken || !authApiRef.current) {
      tokenStore.clear();
      return false;
    }

    try {
      const tokens = await authApiRef.current.refresh({ refreshToken });
      tokenStore.updateTokens(tokens.accessToken, tokens.refreshToken);
      return true;
    } catch {
      tokenStore.clear();
      return false;
    }
  },
});

authApiRef.current = createAuthApi(httpClient);

export const authApi = authApiRef.current;
export { httpClient };
export const studiosApi = createStudiosApi(httpClient);
