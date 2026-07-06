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

let snapshotsReady = false;

function ensureProfileReady(user: AuthUserDto | null): void {
  if (typeof window === "undefined" || snapshotsReady || !user) {
    return;
  }

  initializeProfileSnapshot(user);
  snapshotsReady = true;
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
      return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handler);
    },
    () => {
      if (!user) {
        return null;
      }

      ensureProfileReady(user);
      return getProfileSnapshot() ?? loadProfile(user);
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
