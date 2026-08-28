import type { AuthUserDto } from "@st-manager/contracts";

import {
  flushPendingStudioSettingsUpdates,
  getProfileFromStore,
  hydrateStudioSettingsFromCache,
  updateStudioSettingsOfflineAware,
} from "@/lib/studio-settings/store";
import { profileFromSettingsJson } from "@/lib/studio-settings/map-dto";
import { isBrowserOnline } from "@/lib/sync";

import { notifyProfileUpdated } from "./events";
import { getProfileSnapshot, setProfileSnapshot } from "./snapshots";
import type { StudioProfile, UserRole } from "./types";
import { PROFILE_STORAGE_KEY } from "./types";

function defaultProfile(user: AuthUserDto): StudioProfile {
  return profileFromSettingsJson(user, null);
}

export function normalizeRole(role: string): UserRole {
  if (role === "owner") {
    return "owner";
  }
  if (role === "engineer") {
    return "engineer";
  }
  return "assistant";
}

export function loadProfile(user: AuthUserDto): StudioProfile {
  if (typeof window === "undefined") {
    return defaultProfile(user);
  }

  hydrateStudioSettingsFromCache();
  const cached = getProfileFromStore() ?? getProfileSnapshot();
  if (cached && cached.userId === user.id) {
    return cached;
  }

  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return defaultProfile(user);
    }

    const parsed = JSON.parse(raw) as StudioProfile;
    if (parsed.userId !== user.id) {
      return defaultProfile(user);
    }

    return profileFromSettingsJson(user, parsed);
  } catch {
    return defaultProfile(user);
  }
}

export function saveProfile(profile: StudioProfile): StudioProfile {
  const updated: StudioProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };

  setProfileSnapshot(updated);
  notifyProfileUpdated();

  void updateStudioSettingsOfflineAware({ profile: updated }).then(() => {
    if (isBrowserOnline()) {
      void flushPendingStudioSettingsUpdates();
    }
  });

  return updated;
}

export function mergeServerProfile(
  user: AuthUserDto,
  server: {
    fullName?: string | null;
    phone?: string | null;
    studioName?: string | null;
    email?: string;
  },
): StudioProfile {
  const current = loadProfile(user);
  return saveProfile({
    ...current,
    userId: user.id,
    fullName: server.fullName?.trim() || current.fullName,
    mobile: server.phone?.trim() || current.mobile,
    studioName: server.studioName?.trim() || current.studioName,
    email: server.email?.trim() || current.email || user.email,
  });
}

export function initializeProfileSnapshot(user: AuthUserDto | null): StudioProfile | null {
  if (!user) {
    setProfileSnapshot(null);
    return null;
  }

  hydrateStudioSettingsFromCache();
  const profile = loadProfile(user);
  setProfileSnapshot(profile);
  return profile;
}

export { getProfileSnapshot, PROFILE_STORAGE_KEY };
