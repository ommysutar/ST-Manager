import type { ClientResponseDto } from "@st-manager/contracts";

import { clientsApi } from "@/lib/api-client";
import { loadAllProjects, updateProject } from "@/lib/projects/storage";

import { remapClientDisplayNumber } from "./client-number";
import { notifyClientsUpdated } from "./events";
import {
  buildOptimisticClient,
  createLocalClientId,
  enqueuePendingClientCreate,
  isLocalClientId,
  listPendingClientCreates,
  removePendingClientCreate,
  updatePendingClientCreate,
  type PendingClientCreatePayload,
} from "./offline-queue";
import { filterProductionClients, isTestOrDemoClient } from "./smoke-clients";
import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "./studio-scope";

const CLIENTS_CACHE_KEY = "st-manager-clients-cache";
const CLIENTS_CURSOR_KEY = "st-manager-clients-sync-cursor";
const CLIENTS_TOMBSTONES_KEY = "st-manager-clients-tombstones";

let clientsSnapshot: ClientResponseDto[] = [];
let refreshPromise: Promise<ClientResponseDto[]> | null = null;
let reconcilePromise: Promise<ClientResponseDto[]> | null = null;
let flushPromise: Promise<void> | null = null;

type ClientTombstones = Record<string, string>;

export function getClientsSnapshot(): ClientResponseDto[] {
  return clientsSnapshot;
}

export function setClientsSnapshot(next: ClientResponseDto[]): ClientResponseDto[] {
  clientsSnapshot = next;
  return clientsSnapshot;
}

function sortClients(clients: ClientResponseDto[]): ClientResponseDto[] {
  return [...clients].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

function activeOnly(clients: ClientResponseDto[]): ClientResponseDto[] {
  return clients.filter((client) => !client.deletedAt);
}

function readTombstones(studioId: string | null = getActiveStudioId()): ClientTombstones {
  if (!studioId) return {};
  try {
    const raw = readStudioScopedItem(CLIENTS_TOMBSTONES_KEY, studioId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ClientTombstones;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTombstones(
  tombstones: ClientTombstones,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(CLIENTS_TOMBSTONES_KEY, JSON.stringify(tombstones), studioId);
}

function readCachedClients(studioId: string | null = getActiveStudioId()): ClientResponseDto[] {
  if (!studioId) return [];
  try {
    const raw = readStudioScopedItem(CLIENTS_CACHE_KEY, studioId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClientResponseDto[];
    return Array.isArray(parsed) ? activeOnly(parsed) : [];
  } catch {
    return [];
  }
}

function writeCachedClients(
  clients: ClientResponseDto[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(CLIENTS_CACHE_KEY, JSON.stringify(activeOnly(clients)), studioId);
}

export function readClientsSyncCursor(studioId: string | null = getActiveStudioId()): string | null {
  if (!studioId) return null;
  return readStudioScopedItem(CLIENTS_CURSOR_KEY, studioId);
}

export function writeClientsSyncCursor(
  cursor: string,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(CLIENTS_CURSOR_KEY, cursor, studioId);
}

export function hydrateClientsSnapshotFromCache(): ClientResponseDto[] {
  const cached = filterProductionClients(readCachedClients());
  // Keep pending offline creates visible after restart.
  const pending = listPendingClientCreates().map((entry) =>
    buildOptimisticClient(entry.localId, entry.studioId, entry.payload),
  );
  const byId = new Map<string, ClientResponseDto>();
  for (const client of [...cached, ...pending]) {
    byId.set(client.id, client);
  }
  setClientsSnapshot(sortClients([...byId.values()]));
  return clientsSnapshot;
}

async function purgeTestClientsFromApi(clients: ClientResponseDto[]): Promise<ClientResponseDto[]> {
  const testClients = clients.filter(isTestOrDemoClient);
  if (testClients.length === 0) {
    return clients;
  }

  await Promise.all(
    testClients.map(async (client) => {
      try {
        await clientsApi.deleteClient(client.id);
      } catch {
        // Ignore stale or already-deleted records.
      }
    }),
  );

  return clients.filter((client) => !isTestOrDemoClient(client));
}

export async function loadProductionClients(): Promise<ClientResponseDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: ClientResponseDto[] = [];

  while (page <= 20) {
    const response = await clientsApi.listClients({ page, pageSize });
    all.push(...response.data);
    if (response.data.length < pageSize) {
      break;
    }
    page += 1;
  }

  const productionClients = filterProductionClients(all);
  return purgeTestClientsFromApi(productionClients);
}

export function applyClientChangeRecords(records: ClientResponseDto[]): ClientResponseDto[] {
  const byId = new Map(clientsSnapshot.map((client) => [client.id, client]));
  const tombstones = readTombstones();

  for (const remote of records) {
    if (isTestOrDemoClient(remote)) continue;

    if (remote.deletedAt) {
      const deletedMs = Date.parse(remote.deletedAt);
      const existingTomb = tombstones[remote.id];
      const existingMs = existingTomb ? Date.parse(existingTomb) : 0;
      if (Number.isNaN(deletedMs) || deletedMs >= existingMs) {
        tombstones[remote.id] = remote.deletedAt;
      }
      byId.delete(remote.id);
      continue;
    }

    const tomb = tombstones[remote.id];
    if (tomb) {
      const tombMs = Date.parse(tomb);
      const remoteMs = Date.parse(remote.updatedAt);
      if (!Number.isNaN(tombMs) && (Number.isNaN(remoteMs) || remoteMs <= tombMs)) {
        continue;
      }
      delete tombstones[remote.id];
    }

    const local = byId.get(remote.id);
    if (!local) {
      byId.set(remote.id, remote);
      continue;
    }

    const localMs = Date.parse(local.updatedAt);
    const remoteMs = Date.parse(remote.updatedAt);
    if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
      byId.set(remote.id, remote);
    }
  }

  writeTombstones(tombstones);
  const next = sortClients(activeOnly([...byId.values()]));
  setClientsSnapshot(next);
  writeCachedClients(next);
  return next;
}

export async function refreshClientsSnapshot(): Promise<ClientResponseDto[]> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = loadProductionClients()
    .then((clients) => {
      const pendingLocals = clientsSnapshot.filter((client) => isLocalClientId(client.id));
      const byId = new Map(clients.map((client) => [client.id, client]));
      for (const local of pendingLocals) {
        byId.set(local.id, local);
      }
      const next = sortClients([...byId.values()]);
      setClientsSnapshot(next);
      writeCachedClients(next);
      writeClientsSyncCursor(new Date().toISOString());
      const tombstones = readTombstones();
      for (const client of clients) {
        delete tombstones[client.id];
      }
      writeTombstones(tombstones);
      return next;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function reconcileClientsFromApi(): Promise<ClientResponseDto[]> {
  if (reconcilePromise) {
    return reconcilePromise;
  }

  reconcilePromise = (async () => {
    const studioId = getActiveStudioId();
    if (!studioId) {
      return clientsSnapshot;
    }

    if (clientsSnapshot.length === 0) {
      hydrateClientsSnapshotFromCache();
    }

    const cursor = readClientsSyncCursor(studioId);
    if (!cursor) {
      const full = await refreshClientsSnapshot();
      await flushPendingClientCreates();
      notifyClientsUpdated();
      return full;
    }

    let since = cursor;
    let hasMore = true;
    while (hasMore) {
      const page = await clientsApi.pullClientChanges({ since });
      if (page.records.length > 0) {
        applyClientChangeRecords(page.records);
      }
      writeClientsSyncCursor(page.serverTime, studioId);
      since = page.serverTime;
      hasMore = page.hasMore;
    }

    await flushPendingClientCreates();
    notifyClientsUpdated();
    return clientsSnapshot;
  })().finally(() => {
    reconcilePromise = null;
  });

  return reconcilePromise;
}

export function upsertClientInSnapshot(client: ClientResponseDto): void {
  if (isTestOrDemoClient(client) || client.deletedAt) {
    return;
  }

  const next = sortClients([
    client,
    ...clientsSnapshot.filter((entry) => entry.id !== client.id),
  ]);
  setClientsSnapshot(next);
  writeCachedClients(next);
}

export function removeClientFromSnapshot(clientId: string): void {
  const next = clientsSnapshot.filter((client) => client.id !== clientId);
  setClientsSnapshot(next);
  writeCachedClients(next);
  const tombstones = readTombstones();
  tombstones[clientId] = new Date().toISOString();
  writeTombstones(tombstones);
}

/** Remap offline local client id → server id across snapshot + linked projects. */
export function remapLocalClientId(localId: string, serverClient: ClientResponseDto): void {
  remapClientDisplayNumber(localId, serverClient.id);

  for (const project of loadAllProjects()) {
    if (project.clientId === localId) {
      updateProject(project.id, { clientId: serverClient.id });
    }
  }

  const withoutLocal = clientsSnapshot.filter(
    (client) => client.id !== localId && client.id !== serverClient.id,
  );
  setClientsSnapshot(sortClients([serverClient, ...withoutLocal]));
  writeCachedClients(clientsSnapshot);
  removePendingClientCreate(localId);
}

/**
 * Offline-safe create: appear immediately with a local id, enqueue for API flush.
 * Online path creates via API exactly once.
 */
export async function createClientOfflineAware(
  payload: PendingClientCreatePayload,
): Promise<ClientResponseDto> {
  const studioId = getActiveStudioId();
  if (!studioId) {
    throw new Error("Studio context required");
  }

  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  if (online) {
    try {
      const created = await clientsApi.createClient(payload);
      upsertClientInSnapshot(created);
      notifyClientsUpdated();
      return created;
    } catch (error) {
      // Fall through to offline queue when the network fails mid-request.
      if (typeof navigator !== "undefined" && navigator.onLine) {
        throw error;
      }
    }
  }

  const localId = createLocalClientId();
  const optimistic = buildOptimisticClient(localId, studioId, payload);
  enqueuePendingClientCreate({
    localId,
    studioId,
    payload,
    enqueuedAt: new Date().toISOString(),
  });
  upsertClientInSnapshot(optimistic);
  notifyClientsUpdated();
  return optimistic;
}

/** Flush pending offline creates exactly once each (idempotent via serverId). */
export async function flushPendingClientCreates(): Promise<void> {
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

    const pending = listPendingClientCreates(studioId);
    for (const entry of pending) {
      try {
        if (entry.serverId) {
          const existing = clientsSnapshot.find((client) => client.id === entry.serverId);
          if (existing) {
            remapLocalClientId(entry.localId, existing);
            continue;
          }
          try {
            const fetched = await clientsApi.getClient(entry.serverId);
            remapLocalClientId(entry.localId, fetched);
            continue;
          } catch {
            // Fall through and recreate if the remembered server id is gone.
          }
        }

        // Duplicate prevention: reuse an existing server client with same phone/email.
        const duplicate = clientsSnapshot.find((client) => {
          if (isLocalClientId(client.id) || client.id === entry.localId) {
            return false;
          }
          const phone = entry.payload.phone.trim();
          const email = entry.payload.email.trim().toLowerCase();
          const samePhone = Boolean(phone) && (client.phone?.trim() ?? "") === phone;
          const sameEmail =
            Boolean(email) && (client.email?.trim().toLowerCase() ?? "") === email;
          return samePhone || sameEmail;
        });
        if (duplicate) {
          remapLocalClientId(entry.localId, duplicate);
          continue;
        }

        const created = await clientsApi.createClient(entry.payload);
        updatePendingClientCreate(entry.localId, { serverId: created.id }, studioId);
        remapLocalClientId(entry.localId, created);
      } catch {
        // Leave in queue for the next online/focus reconcile.
      }
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}
