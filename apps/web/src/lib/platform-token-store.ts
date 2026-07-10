"use client";

import type { AuthUserDto } from "@st-manager/contracts";

const ACCESS_TOKEN_KEY = "st-manager.platform.accessToken";
const REFRESH_TOKEN_KEY = "st-manager.platform.refreshToken";
const USER_KEY = "st-manager.platform.user";

export const PLATFORM_AUTH_UPDATED_EVENT = "st-manager-platform-auth-updated";

let platformAuthUserSnapshot: AuthUserDto | null = null;
let platformAuthSnapshotInitialized = false;

function notifyPlatformAuthUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PLATFORM_AUTH_UPDATED_EVENT));
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

export function getPlatformAuthUserSnapshot(): AuthUserDto | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!platformAuthSnapshotInitialized) {
    platformAuthSnapshotInitialized = true;
    platformAuthUserSnapshot = readUserFromStorage();
  }

  return platformAuthUserSnapshot;
}

export const platformTokenStore = {
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
    return getPlatformAuthUserSnapshot();
  },

  setSession(accessToken: string, refreshToken: string, user: AuthUserDto): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    platformAuthUserSnapshot = user;
    platformAuthSnapshotInitialized = true;
    notifyPlatformAuthUpdated();
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    platformAuthUserSnapshot = null;
    platformAuthSnapshotInitialized = true;
    notifyPlatformAuthUpdated();
  },
};
