"use client";

import type { ClientResponseDto } from "@st-manager/contracts";
import { useSyncExternalStore } from "react";

import { EMPTY_CLIENTS } from "@/hooks/empty-server-snapshots";
import { CLIENTS_UPDATED_EVENT } from "@/lib/clients/events";
import { getClientsSnapshot, refreshClientsSnapshot } from "@/lib/clients/store";

let snapshotInitialized = false;

function ensureClientsSnapshotLoaded(): void {
  if (typeof window === "undefined" || snapshotInitialized) {
    return;
  }

  snapshotInitialized = true;
}

function getServerClientsSnapshot(): ClientResponseDto[] {
  return EMPTY_CLIENTS;
}

function subscribeToClients(onStoreChange: () => void): () => void {
  ensureClientsSnapshotLoaded();

  void refreshClientsSnapshot().finally(onStoreChange);

  const handler = () => {
    void refreshClientsSnapshot().finally(onStoreChange);
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

export function refreshClients(): Promise<ClientResponseDto[]> {
  return refreshClientsSnapshot();
}
