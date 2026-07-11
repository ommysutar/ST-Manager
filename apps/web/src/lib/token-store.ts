"use client";

import type { AuthUserDto } from "@st-manager/contracts";

const ACCESS_TOKEN_KEY = "st-manager.accessToken";
const REFRESH_TOKEN_KEY = "st-manager.refreshToken";
const USER_KEY = "st-manager.user";

export const AUTH_UPDATED_EVENT = "st-manager-auth-updated";

/** Stable cached reference for useSyncExternalStore — never parse JSON on every getSnapshot call. */
let authUserSnapshot: AuthUserDto | null = null;
let authSnapshotInitialized = false;

function notifyAuthUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
  }
}

function readUserFromStorage(): AuthUserDto | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUserDto;
  } catch {
    return null;
  }
}

function isSameUser(left: AuthUserDto | null, right: AuthUserDto | null): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.id === right.id &&
    left.email === right.email &&
    left.role === right.role &&
    (left.fullName ?? null) === (right.fullName ?? null) &&
    (left.studioId ?? null) === (right.studioId ?? null) &&
    (left.status ?? null) === (right.status ?? null)
  );
}

/** Returns the cached user snapshot; reads localStorage at most once until the next auth mutation. */
export function getAuthUserSnapshot(): AuthUserDto | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!authSnapshotInitialized) {
    authSnapshotInitialized = true;
    authUserSnapshot = readUserFromStorage();
  }

  return authUserSnapshot;
}

function setAuthUserSnapshot(next: AuthUserDto | null): AuthUserDto | null {
  if (isSameUser(authUserSnapshot, next)) {
    return authUserSnapshot;
  }

  authUserSnapshot = next;
  authSnapshotInitialized = true;
  return authUserSnapshot;
}

export const tokenStore = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getUser(): AuthUserDto | null {
    return getAuthUserSnapshot();
  },

  setSession(accessToken: string, refreshToken: string, user: AuthUserDto): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setAuthUserSnapshot(user);
    notifyAuthUpdated();
  },

  updateUser(user: AuthUserDto): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    authUserSnapshot = user;
    authSnapshotInitialized = true;
    notifyAuthUpdated();
  },

  updateTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    notifyAuthUpdated();
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthUserSnapshot(null);
    notifyAuthUpdated();
  },
};
