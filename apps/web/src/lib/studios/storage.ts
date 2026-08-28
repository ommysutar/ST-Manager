import { generateId } from "@/lib/inquiry/services";
import { migrateLegacyRoomsToStudioCache } from "@/lib/studios/backfill";
import { studioRoomToCreateDto } from "@/lib/studios/map-dto";
import {
  createRoomOfflineAware,
  deleteRoomOfflineAware,
  flushPendingRoomMutations,
  getRoomsStoreSnapshot,
  hydrateRoomsSnapshotFromCache,
  updateRoomOfflineAware,
} from "@/lib/studios/store";
import { isBrowserOnline } from "@/lib/sync";

import { DEFAULT_STUDIOS } from "./constants";
import { notifyStudiosUpdated } from "./events";
import { getStudiosSnapshot, setStudiosSnapshot } from "./snapshots";
import type { StudioRoom } from "./types";
import { DEFAULT_STUDIO_COLOR } from "./types";

function normalizeStudio(raw: Partial<StudioRoom> & { id: string }): StudioRoom {
  const now = new Date().toISOString();
  const roomName = raw.roomName?.trim();
  return {
    id: raw.id,
    name: raw.name?.trim() || "Untitled Studio",
    roomName: roomName || undefined,
    description: raw.description?.trim() ?? "",
    color: raw.color?.trim() || DEFAULT_STUDIO_COLOR,
    active: raw.active ?? true,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
}

function ensureRoomsHydrated(): StudioRoom[] {
  if (getRoomsStoreSnapshot().length === 0) {
    migrateLegacyRoomsToStudioCache();
    hydrateRoomsSnapshotFromCache();
  }
  return getRoomsStoreSnapshot();
}

function syncSnapshotFromStore(): StudioRoom[] {
  const sorted = [...getRoomsStoreSnapshot()]
    .map((studio) => normalizeStudio(studio))
    .sort((a, b) => a.name.localeCompare(b.name));
  setStudiosSnapshot(sorted);
  return sorted;
}

function persistStudios(studios: StudioRoom[]): StudioRoom[] {
  const sorted = [...studios].sort((a, b) => a.name.localeCompare(b.name));
  setStudiosSnapshot(sorted);
  notifyStudiosUpdated();
  return sorted;
}

/** Display label combining studio name and optional room name. */
export function formatStudioLabel(studio: StudioRoom): string {
  return studio.roomName ? `${studio.name} · ${studio.roomName}` : studio.name;
}

export function loadAllStudios(): StudioRoom[] {
  return ensureRoomsHydrated().map((studio) => normalizeStudio(studio));
}

export function getStudio(id: string): StudioRoom | undefined {
  return loadAllStudios().find((studio) => studio.id === id);
}

export function getActiveStudios(): StudioRoom[] {
  return loadAllStudios().filter((studio) => studio.active);
}

export function createStudio(input: Omit<StudioRoom, "id" | "createdAt" | "updatedAt">): StudioRoom {
  const now = new Date().toISOString();
  const payload = studioRoomToCreateDto(input);
  void createRoomOfflineAware(payload).then(() => {
    syncSnapshotFromStore();
    if (isBrowserOnline()) {
      void flushPendingRoomMutations();
    }
  });

  const studio = normalizeStudio({
    id: generateId("std"),
    ...input,
    createdAt: now,
    updatedAt: now,
  });

  persistStudios([studio, ...loadAllStudios()]);
  return studio;
}

export function updateStudio(
  id: string,
  patch: Partial<Omit<StudioRoom, "id" | "createdAt">>,
): StudioRoom | null {
  const studios = loadAllStudios();
  const index = studios.findIndex((studio) => studio.id === id);
  if (index === -1) {
    return null;
  }

  const updated = normalizeStudio({
    ...studios[index],
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  });

  studios[index] = updated;
  persistStudios(studios);

  void updateRoomOfflineAware(id, patch).then(() => {
    syncSnapshotFromStore();
    if (isBrowserOnline()) {
      void flushPendingRoomMutations();
    }
  });

  return updated;
}

export function deleteStudio(id: string): boolean {
  const studios = loadAllStudios();
  const next = studios.filter((studio) => studio.id !== id);
  if (next.length === studios.length) {
    return false;
  }

  persistStudios(next);

  void deleteRoomOfflineAware(id).then(() => {
    syncSnapshotFromStore();
    if (isBrowserOnline()) {
      void flushPendingRoomMutations();
    }
  });

  return true;
}

export function initializeStudioSnapshots(): void {
  migrateLegacyRoomsToStudioCache();
  hydrateRoomsSnapshotFromCache();
  syncSnapshotFromStore();
}

export { getStudiosSnapshot };
