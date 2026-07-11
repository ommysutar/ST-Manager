"use client";

import { useSyncExternalStore } from "react";

import type { AuthUserDto } from "@st-manager/contracts";

import { PROFILE_UPDATED_EVENT } from "@/lib/profile/events";
import {
  getProfileSnapshot,
  initializeProfileSnapshot,
  loadProfile,
  saveProfile,
} from "@/lib/profile/storage";
import type { StudioProfile } from "@/lib/profile/types";
import { AUTH_UPDATED_EVENT } from "@/lib/token-store";

let readyForUserId: string | null = null;

function ensureProfileReady(user: AuthUserDto | null): void {
  if (typeof window === "undefined" || !user) {
    return;
  }

  if (readyForUserId === user.id && getProfileSnapshot()?.userId === user.id) {
    return;
  }

  initializeProfileSnapshot(user);
  readyForUserId = user.id;
}

export function useProfile(user: AuthUserDto | null): StudioProfile | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!user) {
        return () => {};
      }

      ensureProfileReady(user);

      const handler = () => {
        initializeProfileSnapshot(user);
        onStoreChange();
      };

      window.addEventListener(PROFILE_UPDATED_EVENT, handler);
      window.addEventListener(AUTH_UPDATED_EVENT, handler);
      return () => {
        window.removeEventListener(PROFILE_UPDATED_EVENT, handler);
        window.removeEventListener(AUTH_UPDATED_EVENT, handler);
      };
    },
    () => {
      if (!user) {
        return null;
      }

      ensureProfileReady(user);
      return getProfileSnapshot();
    },
    () => null,
  );
}

export function useSaveProfile(user: AuthUserDto | null) {
  return (patch: Partial<StudioProfile>) => {
    if (!user) {
      return null;
    }

    const current = loadProfile(user);
    return saveProfile({ ...current, ...patch, userId: user.id });
  };
}
