import type { ClientResponseDto } from "@st-manager/contracts";

import { clientsApi } from "@/lib/api-client";
import { loadAllProjects, updateProject } from "@/lib/projects/storage";

import { remapClientDisplayNumber, rememberClientDisplayNumber } from "./client-number";
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
import { isBrowserOnline, isRetryableClientSyncFailure, withTimeout } from "./network";
import { filterProductionClients, isTestOrDemoClient } from "./smoke-clients";
import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "./studio-scope";

const EPOCH_ISO = "1970-01-01T00:00:00.000Z";
const REFRESH_TIMEOUT_MS = 8_000;
const CREATE_TIMEOUT_MS = 8_000;

const CLIENTS_CACHE_KEY = "st-manager-clients-cache";
const CLIENTS_CURSOR_KEY = "st-manager-clients-sync-cursor";
const CLIENTS_TOMBSTONES_KEY = "st-manager-clients-tombstones";

let clientsSnapshot: ClientResponseDto[] = [];
let refreshPromise: Promise<ClientResponseDto[]> | null = null;
let reconcilePromise: Promise<ClientResponseDto[]> | null = null;
let flushPromise: Promise<void> | null = null;

/** In-flight online creates keyed by payload fingerprint — prevents double POST. */
const inFlightCreates = new Map<string, Promise<ClientResponseDto>>();

type ClientTombstones = Record<string, string>;

function normalizePhoneDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeEmailValue(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function createPayloadFingerprint(payload: PendingClientCreatePayload): string {
  return [
    payload.name.trim().toLowerCase(),
    normalizePhoneDigits(payload.phone),
    normalizeEmailValue(payload.email),
  ].join("|");
}

function rememberDisplayNumbers(clients: ClientResponseDto[]): void {
  for (const client of clients) {
    if (client.displayNumber) {
      rememberClientDisplayNumber(client.id, client.displayNumber);
    }
  }
}

function findDuplicateInSnapshot(
  payload: PendingClientCreatePayload,
  excludeLocalId?: string,
): ClientResponseDto | undefined {
  const phone = normalizePhoneDigits(payload.phone);
  const email = normalizeEmailValue(payload.email);
  const name = payload.name.trim().toLowerCase();

  return clientsSnapshot.find((client) => {
    if (isLocalClientId(client.id) || client.id === excludeLocalId) {
      return false;
    }
    if (phone.length >= 10 && normalizePhoneDigits(client.phone) === phone) {
      return true;
    }
    if (email && normalizeEmailValue(client.email) === email) {
      return true;
    }
    if (!phone && !email && name && client.name.trim().toLowerCase() === name) {
      return true;
    }
    return false;
  });
}

export function getClientsSnapshot(): ClientResponseDto[] {
  return clientsSnapshot;
}

export function getClientFromSnapshot(clientId: string): ClientResponseDto | undefined {
  return clientsSnapshot.find((client) => client.id === clientId);
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

function latestTimestamp(values: Array<string | null | undefined>): string {
  let max = 0;
  let iso = EPOCH_ISO;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isNaN(ms) && ms >= max) {
      max = ms;
      iso = value;
    }
  }
  return iso;
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
  const tombstones = readTombstones();
  const cached = filterProductionClients(readCachedClients()).filter(
    (client) => !tombstones[client.id],
  );
  // Keep pending offline creates visible after restart.
  const pending = listPendingClientCreates().map((entry) =>
    buildOptimisticClient(entry.localId, entry.studioId, entry.payload),
  );
  const byId = new Map<string, ClientResponseDto>();
  for (const client of [...cached, ...pending]) {
    if (tombstones[client.id] && !isLocalClientId(client.id)) {
      continue;
    }
    byId.set(client.id, client);
  }
  setClientsSnapshot(sortClients([...byId.values()]));
  rememberDisplayNumbers(clientsSnapshot);
  notifyClientsUpdated();
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
  rememberDisplayNumbers(next);
  return next;
}

/**
 * Any server-backed snapshot row missing from the authoritative active list is
 * treated as deleted. This applies remote deletes even when /clients/changes
 * was skipped by a too-new cursor.
 *
 * @param candidateIdsToTombstone Only these pre-existing server ids may be
 *   tombstoned when absent from the list. Ids created while the list request
 *   was in flight are left alone so a slow GET cannot hide a successful POST.
 */
export function applyAuthoritativeActiveList(
  remoteActive: ClientResponseDto[],
  candidateIdsToTombstone?: ReadonlySet<string>,
): ClientResponseDto[] {
  const tombstones = readTombstones();
  const remoteIds = new Set(remoteActive.map((client) => client.id));
  const now = new Date().toISOString();
  const byId = new Map(clientsSnapshot.map((client) => [client.id, client]));
  const mayTombstone = (id: string) =>
    !candidateIdsToTombstone || candidateIdsToTombstone.has(id);

  for (const client of [...byId.values()]) {
    if (isLocalClientId(client.id) || isTestOrDemoClient(client)) {
      continue;
    }
    if (!remoteIds.has(client.id) && mayTombstone(client.id)) {
      tombstones[client.id] = tombstones[client.id] ?? now;
      byId.delete(client.id);
    }
  }

  for (const remote of remoteActive) {
    if (isTestOrDemoClient(remote) || remote.deletedAt) {
      continue;
    }
    // Active list membership is source of truth: a live server row always
    // clears a local absence-tombstone (prevents permanent hide after a race).
    delete tombstones[remote.id];
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
  const next = sortClients(
    activeOnly([...byId.values()]).filter(
      (client) => isLocalClientId(client.id) || !tombstones[client.id],
    ),
  );
  setClientsSnapshot(next);
  writeCachedClients(next);
  rememberDisplayNumbers(next);
  return next;
}

function serverIdsInSnapshot(): Set<string> {
  return new Set(
    clientsSnapshot.filter((client) => !isLocalClientId(client.id)).map((client) => client.id),
  );
}

export async function refreshClientsSnapshot(): Promise<ClientResponseDto[]> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const knownIdsBeforeFetch = serverIdsInSnapshot();

  refreshPromise = withTimeout(loadProductionClients(), REFRESH_TIMEOUT_MS)
    .then((clients) => {
      const pendingLocals = clientsSnapshot.filter((client) => isLocalClientId(client.id));
      const byId = new Map(clients.map((client) => [client.id, client]));
      for (const local of pendingLocals) {
        byId.set(local.id, local);
      }
      for (const current of clientsSnapshot) {
        if (!isLocalClientId(current.id) && !knownIdsBeforeFetch.has(current.id) && !byId.has(current.id)) {
          byId.set(current.id, current);
        }
      }

      const tombstones = readTombstones();
      const now = new Date().toISOString();
      const remoteIds = new Set(clients.map((client) => client.id));
      for (const priorId of knownIdsBeforeFetch) {
        if (!remoteIds.has(priorId)) {
          tombstones[priorId] = tombstones[priorId] ?? now;
        }
      }
      for (const client of clients) {
        delete tombstones[client.id];
      }
      writeTombstones(tombstones);

      const next = sortClients(
        [...byId.values()].filter(
          (client) => isLocalClientId(client.id) || !tombstones[client.id],
        ),
      );
      setClientsSnapshot(next);
      writeCachedClients(next);
      writeClientsSyncCursor(latestTimestamp(clients.map((client) => client.updatedAt)));
      rememberDisplayNumbers(next);
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

    if (!isBrowserOnline()) {
      hydrateClientsSnapshotFromCache();
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
      const page = await withTimeout(clientsApi.pullClientChanges({ since }), REFRESH_TIMEOUT_MS);
      if (page.records.length > 0) {
        applyClientChangeRecords(page.records);
      }
      const parsedServer = Date.parse(page.serverTime);
      const parsedSince = Date.parse(since);
      const nextCursor =
        !Number.isNaN(parsedServer) && (Number.isNaN(parsedSince) || parsedServer >= parsedSince)
          ? page.serverTime
          : since;
      writeClientsSyncCursor(nextCursor, studioId);
      since = nextCursor;
      hasMore = page.hasMore;
    }

    const knownIdsBeforeList = serverIdsInSnapshot();
    applyAuthoritativeActiveList(
      await withTimeout(loadProductionClients(), REFRESH_TIMEOUT_MS),
      knownIdsBeforeList,
    );

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

  const tomb = readTombstones()[client.id];
  if (tomb && !isLocalClientId(client.id)) {
    const tombMs = Date.parse(tomb);
    const clientMs = Date.parse(client.updatedAt);
    if (!Number.isNaN(tombMs) && (Number.isNaN(clientMs) || clientMs <= tombMs)) {
      return;
    }
    const tombstones = readTombstones();
    delete tombstones[client.id];
    writeTombstones(tombstones);
  }

  if (client.displayNumber) {
    rememberClientDisplayNumber(client.id, client.displayNumber);
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
  if (serverClient.displayNumber) {
    rememberClientDisplayNumber(serverClient.id, serverClient.displayNumber);
  }

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
  notifyClientsUpdated();
}

function enqueueOptimisticCreate(
  studioId: string,
  payload: PendingClientCreatePayload,
): ClientResponseDto {
  const duplicate = findDuplicateInSnapshot(payload);
  if (duplicate) {
    return duplicate;
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

/**
 * Offline-safe create: appear immediately with a local id, enqueue for API flush.
 * Online success still creates via API exactly once. Retryable network failures
 * stay queued instead of hanging the UI or dropping the record.
 */
export async function createClientOfflineAware(
  payload: PendingClientCreatePayload,
): Promise<ClientResponseDto> {
  const studioId = getActiveStudioId();
  if (!studioId) {
    throw new Error("Studio context required");
  }

  const existing = findDuplicateInSnapshot(payload);
  if (existing) {
    return existing;
  }

  if (!isBrowserOnline()) {
    return enqueueOptimisticCreate(studioId, payload);
  }

  const fingerprint = createPayloadFingerprint(payload);
  const inflight = inFlightCreates.get(fingerprint);
  if (inflight) {
    return inflight;
  }

  const request = clientsApi.createClient(payload);
  void request.catch(() => undefined);
  inFlightCreates.set(fingerprint, request);

  const createPromise = (async () => {
    try {
      const created = await withTimeout(request, CREATE_TIMEOUT_MS);
      upsertClientInSnapshot(created);
      notifyClientsUpdated();
      return created;
    } catch (error) {
      if (!isRetryableClientSyncFailure(error)) {
        throw error;
      }
      const optimistic = enqueueOptimisticCreate(studioId, payload);
      void request
        .then((created) => {
          updatePendingClientCreate(optimistic.id, { serverId: created.id }, studioId);
          remapLocalClientId(optimistic.id, created);
        })
        .catch(() => {
          // Leave queued for flush if the original POST never landed.
        });
      return optimistic;
    }
  })();

  void request.finally(() => {
    inFlightCreates.delete(fingerprint);
  });

  return createPromise;
}

/** Flush pending offline creates exactly once each (idempotent via serverId + contact dedupe). */
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
        const fingerprint = createPayloadFingerprint(entry.payload);
        const inflight = inFlightCreates.get(fingerprint);
        if (inflight) {
          try {
            const created = await inflight;
            updatePendingClientCreate(entry.localId, { serverId: created.id }, studioId);
            remapLocalClientId(entry.localId, created);
          } catch {
            // Original POST still failing — keep queued.
          }
          continue;
        }

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

        const duplicate = findDuplicateInSnapshot(entry.payload, entry.localId);
        if (duplicate) {
          updatePendingClientCreate(entry.localId, { serverId: duplicate.id }, studioId);
          remapLocalClientId(entry.localId, duplicate);
          continue;
        }

        const created = await withTimeout(clientsApi.createClient(entry.payload), CREATE_TIMEOUT_MS);
        // Persist serverId BEFORE remap so a crash mid-remap still retries idempotently.
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
