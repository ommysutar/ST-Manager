import type { StudioSettingsResponseDto } from "@st-manager/contracts";

import { studioSettingsApi } from "@/lib/api-client";
import {
  getActiveStudioId,
  isBrowserOnline,
  isRetryableSyncFailure,
  readStudioScopedItem,
  withTimeout,
  writeStudioScopedItem,
} from "@/lib/sync";
import { notifyProfileUpdated } from "@/lib/profile/events";
import { setProfileSnapshot } from "@/lib/profile/snapshots";
import type { StudioProfile } from "@/lib/profile/types";
import { notifyWhatsAppSettingsUpdated } from "@/lib/whatsapp/events";
import { setWhatsAppSettingsSnapshot } from "@/lib/whatsapp/snapshots";
import type { WhatsAppSettings } from "@/lib/whatsapp/types";
import { getAuthUserSnapshot } from "@/lib/token-store";

import { migrateLegacyStudioSettingsToStudioCache, runLegacyStudioSettingsBackfill } from "./backfill";
import { buildUpdateDto, settingsDtoToLocal } from "./map-dto";
import {
  clearPendingStudioSettingsUpdates,
  enqueuePendingStudioSettingsUpdate,
  listPendingStudioSettingsUpdates,
} from "./offline-queue";

const SETTINGS_CACHE_KEY = "st-manager-studio-settings-cache";
const SETTINGS_CURSOR_KEY = "st-manager-studio-settings-sync-cursor";

const REFRESH_TIMEOUT_MS = 8_000;
const UPDATE_TIMEOUT_MS = 8_000;

let profileSnapshot: StudioProfile | null = null;
let whatsappSnapshot: WhatsAppSettings | null = null;
let settingsMeta: Pick<StudioSettingsResponseDto, "id" | "updatedAt"> | null = null;
let reconcilePromise: Promise<void> | null = null;
let flushPromise: Promise<void> | null = null;

function requireUser() {
  const user = getAuthUserSnapshot();
  if (!user) {
    throw new Error("Auth context required");
  }
  return user;
}

function readCachedSettings(): StudioSettingsResponseDto | null {
  const studioId = getActiveStudioId();
  if (!studioId) return null;
  try {
    const raw = readStudioScopedItem(SETTINGS_CACHE_KEY, studioId);
    if (!raw) return null;
    return JSON.parse(raw) as StudioSettingsResponseDto;
  } catch {
    return null;
  }
}

function writeCachedSettings(dto: StudioSettingsResponseDto): void {
  const studioId = getActiveStudioId();
  if (!studioId) return;
  writeStudioScopedItem(SETTINGS_CACHE_KEY, JSON.stringify(dto), studioId);
}

export function readStudioSettingsSyncCursor(
  studioId: string | null = getActiveStudioId(),
): string | null {
  if (!studioId) return null;
  return readStudioScopedItem(SETTINGS_CURSOR_KEY, studioId);
}

export function writeStudioSettingsSyncCursor(
  cursor: string,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(SETTINGS_CURSOR_KEY, cursor, studioId);
}

function applyLocalSnapshots(profile: StudioProfile, whatsapp: WhatsAppSettings): void {
  profileSnapshot = profile;
  whatsappSnapshot = whatsapp;
  setProfileSnapshot(profile);
  setWhatsAppSettingsSnapshot(whatsapp);
}

export function getProfileFromStore(): StudioProfile | null {
  return profileSnapshot;
}

export function getWhatsAppFromStore(): WhatsAppSettings | null {
  return whatsappSnapshot;
}

export function hydrateStudioSettingsFromCache(): void {
  migrateLegacyStudioSettingsToStudioCache();
  const user = getAuthUserSnapshot();
  if (!user) {
    profileSnapshot = null;
    whatsappSnapshot = null;
    return;
  }

  const cached = readCachedSettings();
  if (!cached) {
    return;
  }

  const local = settingsDtoToLocal(cached, user);
  applyLocalSnapshots(local.profile, local.whatsapp);
  settingsMeta = { id: cached.id, updatedAt: cached.updatedAt };
}

function applyRemoteSettings(dto: StudioSettingsResponseDto): void {
  const user = requireUser();
  const local = settingsDtoToLocal(dto, user);
  applyLocalSnapshots(local.profile, local.whatsapp);
  settingsMeta = { id: dto.id, updatedAt: dto.updatedAt };
  writeCachedSettings(dto);
}

export async function refreshStudioSettingsFromApi(): Promise<void> {
  const remote = await withTimeout(studioSettingsApi.getStudioSettings(), REFRESH_TIMEOUT_MS);
  applyRemoteSettings(remote);
  writeStudioSettingsSyncCursor(remote.updatedAt);
}

export async function reconcileStudioSettingsFromApi(): Promise<void> {
  if (reconcilePromise) {
    return reconcilePromise;
  }

  reconcilePromise = (async () => {
    const studioId = getActiveStudioId();
    if (!studioId) {
      return;
    }

    if (!isBrowserOnline()) {
      hydrateStudioSettingsFromCache();
      return;
    }

    hydrateStudioSettingsFromCache();

    const cursor = readStudioSettingsSyncCursor(studioId);
    if (!cursor) {
      await refreshStudioSettingsFromApi();
      await flushPendingStudioSettingsUpdates();
      await runLegacyStudioSettingsBackfill();
      notifyProfileUpdated();
      notifyWhatsAppSettingsUpdated();
      return;
    }

    let since = cursor;
    let hasMore = true;
    while (hasMore) {
      const page = await withTimeout(
        studioSettingsApi.pullStudioSettingsChanges({ since }),
        REFRESH_TIMEOUT_MS,
      );
      const latest = page.records.at(-1);
      if (latest && !latest.deletedAt) {
        applyRemoteSettings(latest);
      }
      const parsedServer = Date.parse(page.serverTime);
      const parsedSince = Date.parse(since);
      const nextCursor =
        !Number.isNaN(parsedServer) && (Number.isNaN(parsedSince) || parsedServer >= parsedSince)
          ? page.serverTime
          : since;
      writeStudioSettingsSyncCursor(nextCursor, studioId);
      since = nextCursor;
      hasMore = page.hasMore;
    }

    await refreshStudioSettingsFromApi();
    await flushPendingStudioSettingsUpdates();
    await runLegacyStudioSettingsBackfill();
    notifyProfileUpdated();
    notifyWhatsAppSettingsUpdated();
  })().finally(() => {
    reconcilePromise = null;
  });

  return reconcilePromise;
}

export async function updateStudioSettingsOfflineAware(patch: {
  profile?: StudioProfile;
  whatsapp?: WhatsAppSettings;
}): Promise<void> {
  const studioId = getActiveStudioId();
  if (!studioId) {
    throw new Error("Studio context required");
  }

  const user = requireUser();
  const currentProfile = profileSnapshot ?? settingsDtoToLocal(readCachedSettings() ?? {
    id: "",
    studioId,
    profile: {},
    whatsapp: {},
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, user).profile;

  const currentWhatsapp =
    whatsappSnapshot ??
    settingsDtoToLocal(
      readCachedSettings() ?? {
        id: "",
        studioId,
        profile: {},
        whatsapp: {},
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      user,
    ).whatsapp;

  const nextProfile = patch.profile ?? currentProfile;
  const nextWhatsapp = patch.whatsapp ?? currentWhatsapp;
  applyLocalSnapshots(nextProfile, nextWhatsapp);

  const updateDto = buildUpdateDto(patch);
  if (!isBrowserOnline()) {
    enqueuePendingStudioSettingsUpdate({
      studioId,
      payload: updateDto,
      enqueuedAt: new Date().toISOString(),
    });
    notifyProfileUpdated();
    notifyWhatsAppSettingsUpdated();
    return;
  }

  try {
    const remote = await withTimeout(
      studioSettingsApi.updateStudioSettings(updateDto),
      UPDATE_TIMEOUT_MS,
    );
    applyRemoteSettings(remote);
    notifyProfileUpdated();
    notifyWhatsAppSettingsUpdated();
  } catch (error) {
    if (!isRetryableSyncFailure(error)) {
      throw error;
    }
    enqueuePendingStudioSettingsUpdate({
      studioId,
      payload: updateDto,
      enqueuedAt: new Date().toISOString(),
    });
    notifyProfileUpdated();
    notifyWhatsAppSettingsUpdated();
  }
}

export async function flushPendingStudioSettingsUpdates(): Promise<void> {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    const studioId = getActiveStudioId();
    if (!studioId) {
      return;
    }

    for (const entry of listPendingStudioSettingsUpdates(studioId)) {
      try {
        const remote = await withTimeout(
          studioSettingsApi.updateStudioSettings(entry.payload),
          UPDATE_TIMEOUT_MS,
        );
        applyRemoteSettings(remote);
        clearPendingStudioSettingsUpdates(studioId);
      } catch {
        // Keep queued.
      }
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

export function setStudioSettingsStoreForTests(
  profile: StudioProfile | null,
  whatsapp: WhatsAppSettings | null,
): void {
  profileSnapshot = profile;
  whatsappSnapshot = whatsapp;
}
