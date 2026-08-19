"use client";

import type { ClientResponseDto } from "@st-manager/contracts";
import { useSyncExternalStore } from "react";

import { EMPTY_CLIENTS } from "@/hooks/empty-server-snapshots";
import { CLIENTS_UPDATED_EVENT } from "@/lib/clients/events";
import { requestClientApiReconcile } from "@/lib/clients/reconcile";
import {
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

export async function refreshClients(): Promise<ClientResponseDto[]> {
  const { refreshClientsSnapshot } = await import("@/lib/clients/store");
  return refreshClientsSnapshot();
}
