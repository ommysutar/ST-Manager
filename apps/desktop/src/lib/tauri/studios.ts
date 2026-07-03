import { invoke } from "@tauri-apps/api/core";

export type LocalSyncStatus = "pending" | "synced" | "failed";

export interface LocalStudioDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: LocalSyncStatus;
  lastSyncError: string | null;
}

export interface PulledStudioDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncStatusDto {
  pendingCount: number;
  lastPulledAt: string | null;
  isOnlineHint: boolean;
}

export function listLocalStudios(): Promise<LocalStudioDto[]> {
  return invoke<LocalStudioDto[]>("list_local_studios");
}

export function createLocalStudio(name: string): Promise<LocalStudioDto> {
  return invoke<LocalStudioDto>("create_local_studio", { name });
}

export function listPendingStudios(): Promise<LocalStudioDto[]> {
  return invoke<LocalStudioDto[]>("list_pending_studios");
}

export function markStudiosSynced(ids: string[]): Promise<void> {
  return invoke("mark_studios_synced", { ids });
}

export function markStudioSyncFailed(id: string, error: string): Promise<void> {
  return invoke("mark_studio_sync_failed", { id, error });
}

export function mergePulledStudios(studios: PulledStudioDto[]): Promise<number> {
  return invoke<number>("merge_pulled_studios", { studios });
}

export function getStudiosLastPulledAt(): Promise<string | null> {
  return invoke<string | null>("get_studios_last_pulled_at");
}

export function setStudiosLastPulledAt(value: string): Promise<void> {
  return invoke("set_studios_last_pulled_at", { value });
}

export function getSyncStatus(): Promise<SyncStatusDto> {
  return invoke<SyncStatusDto>("get_sync_status");
}
