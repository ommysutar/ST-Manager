"use client";

import { PLATFORM_ROLES } from "@st-manager/constants";
import { useCallback, useSyncExternalStore } from "react";

import { platformAdminApi } from "@/lib/platform-api-client";
import {
  getPlatformAuthUserSnapshot,
  PLATFORM_AUTH_UPDATED_EVENT,
  platformTokenStore,
} from "@/lib/platform-token-store";

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(PLATFORM_AUTH_UPDATED_EVENT, onStoreChange);
  return () => window.removeEventListener(PLATFORM_AUTH_UPDATED_EVENT, onStoreChange);
}

export function usePlatformAuth() {
  const user = useSyncExternalStore(subscribe, getPlatformAuthUserSnapshot, () => null);

  const login = useCallback(async (email: string, password: string) => {
    const session = await platformAdminApi.login({ email, password });
    if (session.user.role !== PLATFORM_ROLES.PLATFORM_ADMIN) {
      platformTokenStore.clear();
      throw new Error("Platform admin access required");
    }
    platformTokenStore.setSession(session.accessToken, session.refreshToken, session.user);
    return session.user;
  }, []);

  const logout = useCallback(() => {
    platformTokenStore.clear();
  }, []);

  return {
    user,
    isAuthenticated: Boolean(user) && user?.role === PLATFORM_ROLES.PLATFORM_ADMIN,
    login,
    logout,
  };
}
