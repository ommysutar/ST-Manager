"use client";

import type { RegisterRequestDto } from "@st-manager/contracts";
import { ApiError } from "@st-manager/api-sdk";
import { useCallback, useState, useSyncExternalStore } from "react";

import { authApi } from "@/lib/api-client";
import { loadProfile, saveProfile } from "@/lib/profile/storage";
import { AUTH_UPDATED_EVENT, getAuthUserSnapshot, tokenStore } from "@/lib/token-store";

function subscribeToAuth(onStoreChange: () => void): () => void {
  window.addEventListener(AUTH_UPDATED_EVENT, onStoreChange);
  return () => window.removeEventListener(AUTH_UPDATED_EVENT, onStoreChange);
}

export function useAuth() {
  const user = useSyncExternalStore(subscribeToAuth, getAuthUserSnapshot, () => null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const session = await authApi.login({ email, password });
      tokenStore.setSession(session.accessToken, session.refreshToken, session.user);
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
    setError(null);
  }, []);

  const register = useCallback(async (input: RegisterRequestDto) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const session = await authApi.register(input);
      tokenStore.setSession(session.accessToken, session.refreshToken, session.user);

      const profile = loadProfile(session.user);
      saveProfile({
        ...profile,
        studioName: input.studioName.trim(),
        fullName: input.ownerName.trim(),
        email: session.user.email,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Registration failed";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    user,
    isAuthenticated: Boolean(user),
    isSubmitting,
    error,
    login,
    register,
    logout,
  };
}
