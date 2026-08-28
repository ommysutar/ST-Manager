import type { UpdateStudioSettingsDto } from "@st-manager/contracts";

import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";

const PENDING_UPDATES_KEY = "st-manager-studio-settings-pending-updates";

export interface PendingStudioSettingsUpdate {
  studioId: string;
  payload: UpdateStudioSettingsDto;
  enqueuedAt: string;
}

function readQueue(studioId: string | null = getActiveStudioId()): PendingStudioSettingsUpdate[] {
  if (!studioId) return [];
  try {
    const raw = readStudioScopedItem(PENDING_UPDATES_KEY, studioId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingStudioSettingsUpdate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(
  queue: PendingStudioSettingsUpdate[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(PENDING_UPDATES_KEY, JSON.stringify(queue), studioId);
}

export function listPendingStudioSettingsUpdates(
  studioId: string | null = getActiveStudioId(),
): PendingStudioSettingsUpdate[] {
  return readQueue(studioId);
}

export function enqueuePendingStudioSettingsUpdate(entry: PendingStudioSettingsUpdate): void {
  writeQueue([entry], entry.studioId);
}

export function clearPendingStudioSettingsUpdates(
  studioId: string | null = getActiveStudioId(),
): void {
  writeQueue([], studioId);
}
