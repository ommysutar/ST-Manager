"use client";

import type { ClientResponseDto } from "@st-manager/contracts";
import { useSyncExternalStore } from "react";

import { EMPTY_CLIENTS } from "@/hooks/empty-server-snapshots";
import { CLIENTS_UPDATED_EVENT } from "@/lib/clients/events";
import { requestClientApiReconcile } from "@/lib/clients/reconcile";
import { isTestOrDemoClient } from "@/lib/clients/smoke-clients";
import {
  getClientFromSnapshot,
  getClientsSnapshot,
  hydrateClientsSnapshotFromCache,
} from "@/lib/clients/store";

let snapshotInitialized = false;

function ensureClientsSnapshotLoaded(): void {
  if (typeof window === "undefined" || snapshotInitialized) {
    return;
  }

  snapshotInitialized = true;
  hydrateClientsSnapshotFromCache();
}

function getServerClientsSnapshot(): ClientResponseDto[] {
  return EMPTY_CLIENTS;
}

/**
 * Subscribe to the in-memory client snapshot.
 * Reconcile runs in the background; UI updates from cache + CLIENTS_UPDATED_EVENT
 * without requiring a full-page reload or blocking on a full list refresh.
 */
function subscribeToClients(onStoreChange: () => void): () => void {
  ensureClientsSnapshotLoaded();
  onStoreChange();

  void requestClientApiReconcile().finally(onStoreChange);

  const handler = () => {
    onStoreChange();
  };

  window.addEventListener(CLIENTS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(CLIENTS_UPDATED_EVENT, handler);
}

function readClientsSnapshot(): ClientResponseDto[] {
  ensureClientsSnapshotLoaded();
  return getClientsSnapshot();
}

export function useClients(): ClientResponseDto[] {
  return useSyncExternalStore(subscribeToClients, readClientsSnapshot, getServerClientsSnapshot);
}

function subscribeToClient(clientId: string, onStoreChange: () => void): () => void {
  ensureClientsSnapshotLoaded();
  onStoreChange();

  const handler = () => {
    onStoreChange();
  };

  window.addEventListener(CLIENTS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(CLIENTS_UPDATED_EVENT, handler);
}

function readClientFromSnapshot(clientId: string): ClientResponseDto | null {
  ensureClientsSnapshotLoaded();
  const cached = getClientFromSnapshot(clientId);
  if (cached && !isTestOrDemoClient(cached)) {
    return cached;
  }
  return null;
}

/** Subscribe to one client from the in-memory snapshot (cache + offline queue). */
export function useClient(clientId: string): ClientResponseDto | null {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToClient(clientId, onStoreChange),
    () => readClientFromSnapshot(clientId),
    () => null,
  );
}

export async function refreshClients(): Promise<ClientResponseDto[]> {
  const { refreshClientsSnapshot } = await import("@/lib/clients/store");
  return refreshClientsSnapshot();
}
