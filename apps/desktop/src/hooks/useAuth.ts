import { ApiError } from "@st-manager/api-sdk";
import { useCallback, useState } from "react";

import { authApi } from "../lib/api-client";
import { tokenStore } from "../lib/token-store";

export function useAuth() {
  const [user, setUser] = useState(() => tokenStore.getUser());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const session = await authApi.login({ email, password });
      tokenStore.setSession(session.accessToken, session.refreshToken, session.user);
      setUser(session.user);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Sign in failed";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setError(null);
  }, []);

  return {
    user,
    isAuthenticated: Boolean(user),
    isSubmitting,
    error,
    login,
    logout,
  };
}
