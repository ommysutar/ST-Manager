import { createAuthApi, createAiApi, createHttpClient, createSyncApi, createStudiosApi, type AuthApi } from "@st-manager/api-sdk";

import { tokenStore } from "./token-store";

const baseUrl =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? window.location.origin : "http://localhost:4000");

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
export const syncApi = createSyncApi(httpClient);
export const aiApi = createAiApi(httpClient);
