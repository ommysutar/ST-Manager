import { generateId } from "@/lib/inquiry/services";

import { DEFAULT_STUDIOS } from "./constants";
import { notifyStudiosUpdated } from "./events";
import { getStudiosSnapshot, setStudiosSnapshot } from "./snapshots";
import type { StudioRoom } from "./types";
import { DEFAULT_STUDIO_COLOR, STUDIOS_STORAGE_KEY } from "./types";

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

/** Display label combining studio name and optional room name. */
export function formatStudioLabel(studio: StudioRoom): string {
  return studio.roomName ? `${studio.name} · ${studio.roomName}` : studio.name;
}

function readStudiosFromStorage(): StudioRoom[] {
  if (typeof window === "undefined") {
    return DEFAULT_STUDIOS;
  }

  try {
    const raw = localStorage.getItem(STUDIOS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STUDIOS;
    }

    const parsed = JSON.parse(raw) as Partial<StudioRoom>[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_STUDIOS;
    }

    return parsed.map((studio) => normalizeStudio(studio as StudioRoom));
  } catch {
    return DEFAULT_STUDIOS;
  }
}

function persistStudios(studios: StudioRoom[]): StudioRoom[] {
  const sorted = [...studios].sort((a, b) => a.name.localeCompare(b.name));
  localStorage.setItem(STUDIOS_STORAGE_KEY, JSON.stringify(sorted));
  setStudiosSnapshot(sorted);
  notifyStudiosUpdated();
  return sorted;
}

export function loadAllStudios(): StudioRoom[] {
  return readStudiosFromStorage();
}

export function getStudio(id: string): StudioRoom | undefined {
  return loadAllStudios().find((studio) => studio.id === id);
}

export function getActiveStudios(): StudioRoom[] {
  return loadAllStudios().filter((studio) => studio.active);
}

export function createStudio(input: Omit<StudioRoom, "id" | "createdAt" | "updatedAt">): StudioRoom {
  const now = new Date().toISOString();
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
  return updated;
}

export function deleteStudio(id: string): boolean {
  const studios = loadAllStudios();
  const next = studios.filter((studio) => studio.id !== id);
  if (next.length === studios.length) {
    return false;
  }

  persistStudios(next);
  return true;
}

export function initializeStudioSnapshots(): void {
  setStudiosSnapshot(loadAllStudios());
}

export { getStudiosSnapshot };
