import {
  getActiveStudioId,
  isBrowserOnline,
  isRetryableSyncFailure,
  readStudioScopedItem,
  withTimeout,
  writeStudioScopedItem,
} from "@/lib/sync";

const EPOCH_ISO = "1970-01-01T00:00:00.000Z";
const REFRESH_TIMEOUT_MS = 8_000;
const CREATE_TIMEOUT_MS = 8_000;

type SyncRecord = {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
};

type Tombstones = Record<string, string>;

export interface PendingCreateEntry<TCreate> {
  localId: string;
  studioId: string;
  payload: TCreate;
  enqueuedAt: string;
  serverId?: string;
}

export interface PendingUpdateEntry<TUpdate> {
  id: string;
  studioId: string;
  payload: TUpdate;
  enqueuedAt: string;
}

export interface PendingDeleteEntry {
  id: string;
  studioId: string;
  enqueuedAt: string;
}

export interface ListEntityOfflineQueue<TCreate, TUpdate, TLocal> {
  isLocalId: (id: string) => boolean;
  createLocalId: () => string;
  listPendingCreates: (studioId?: string | null) => PendingCreateEntry<TCreate>[];
  enqueuePendingCreate: (entry: PendingCreateEntry<TCreate>) => void;
  updatePendingCreate: (
    localId: string,
    patch: Partial<PendingCreateEntry<TCreate>>,
    studioId?: string | null,
  ) => void;
  removePendingCreate: (localId: string, studioId?: string | null) => void;
  buildOptimisticRecord: (localId: string, payload: TCreate) => TLocal;
  listPendingUpdates?: (studioId?: string | null) => PendingUpdateEntry<TUpdate>[];
  enqueuePendingUpdate?: (entry: PendingUpdateEntry<TUpdate>) => void;
  removePendingUpdate?: (id: string, studioId?: string | null) => void;
  listPendingDeletes?: (studioId?: string | null) => PendingDeleteEntry[];
  enqueuePendingDelete?: (entry: PendingDeleteEntry) => void;
  removePendingDelete?: (id: string, studioId?: string | null) => void;
}

export interface ListEntitySyncApi<TRemote extends SyncRecord, TCreate, TUpdate> {
  listAll: () => Promise<TRemote[]>;
  pullChanges: (since: string) => Promise<{
    records: TRemote[];
    serverTime: string;
    hasMore: boolean;
  }>;
  create: (payload: TCreate) => Promise<TRemote>;
  update: (id: string, payload: TUpdate) => Promise<TRemote>;
  delete: (id: string) => Promise<void>;
  get?: (id: string) => Promise<TRemote>;
}

export interface ListEntitySyncMaps<TLocal, TRemote extends SyncRecord, TCreate, TUpdate> {
  dtoToLocal: (dto: TRemote) => TLocal;
  localToCreateDto: (local: TLocal) => TCreate;
  patchToUpdateDto: (patch: Partial<TLocal>) => TUpdate;
  localToResponseDto: (local: TLocal, studioId: string) => TRemote;
  getLocalId: (local: TLocal) => string;
}

export interface ListEntitySyncStoreOptions<TLocal, TRemote extends SyncRecord, TCreate, TUpdate> {
  cacheKey: string;
  cursorKey: string;
  tombstonesKey: string;
  api: ListEntitySyncApi<TRemote, TCreate, TUpdate>;
  maps: ListEntitySyncMaps<TLocal, TRemote, TCreate, TUpdate>;
  queue: ListEntityOfflineQueue<TCreate, TUpdate, TLocal>;
  sort: (items: TLocal[]) => TLocal[];
  notifyUpdated: () => void;
  setModuleSnapshot: (items: TLocal[]) => void;
  findDuplicate?: (payload: TCreate, excludeLocalId?: string) => TLocal | undefined;
  createPayloadFingerprint?: (payload: TCreate) => string;
  afterReconcile?: () => Promise<void>;
  onFirstEmptyRefresh?: () => Promise<void>;
}

export function createListEntitySyncStore<TLocal, TRemote extends SyncRecord, TCreate, TUpdate>(
  options: ListEntitySyncStoreOptions<TLocal, TRemote, TCreate, TUpdate>,
) {
  const {
    cacheKey,
    cursorKey,
    tombstonesKey,
    api,
    maps,
    queue,
    sort,
    notifyUpdated,
    setModuleSnapshot,
  } = options;

  let snapshot: TLocal[] = [];
  let refreshPromise: Promise<TLocal[]> | null = null;
  let reconcilePromise: Promise<TLocal[]> | null = null;
  let flushPromise: Promise<void> | null = null;
  const inFlightCreates = new Map<string, Promise<TRemote>>();

  function getSnapshot(): TLocal[] {
    return snapshot;
  }

  function setSnapshot(next: TLocal[]): TLocal[] {
    snapshot = next;
    setModuleSnapshot(next);
    return snapshot;
  }

  function readTombstones(studioId: string | null = getActiveStudioId()): Tombstones {
    if (!studioId) return {};
    try {
      const raw = readStudioScopedItem(tombstonesKey, studioId);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Tombstones;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeTombstones(
    tombstones: Tombstones,
    studioId: string | null = getActiveStudioId(),
  ): void {
    if (!studioId) return;
    writeStudioScopedItem(tombstonesKey, JSON.stringify(tombstones), studioId);
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

  function readCached(studioId: string | null = getActiveStudioId()): TLocal[] {
    if (!studioId) return [];
    try {
      const raw = readStudioScopedItem(cacheKey, studioId);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as TLocal[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeCached(items: TLocal[], studioId: string | null = getActiveStudioId()): void {
    if (!studioId) return;
    writeStudioScopedItem(cacheKey, JSON.stringify(items), studioId);
  }

  function readSyncCursor(studioId: string | null = getActiveStudioId()): string | null {
    if (!studioId) return null;
    return readStudioScopedItem(cursorKey, studioId);
  }

  function writeSyncCursor(cursor: string, studioId: string | null = getActiveStudioId()): void {
    if (!studioId) return;
    writeStudioScopedItem(cursorKey, cursor, studioId);
  }

  function serverIdsInSnapshot(): Set<string> {
    return new Set(
      snapshot
        .filter((item) => !queue.isLocalId(maps.getLocalId(item)))
        .map((item) => maps.getLocalId(item)),
    );
  }

  function hydrateFromCache(): TLocal[] {
    const tombstones = readTombstones();
    const cached = readCached().filter((item) => !tombstones[maps.getLocalId(item)]);
    const pending = queue.listPendingCreates().map((entry) =>
      queue.buildOptimisticRecord(entry.localId, entry.payload),
    );
    const byId = new Map<string, TLocal>();
    for (const item of [...cached, ...pending]) {
      const id = maps.getLocalId(item);
      if (tombstones[id] && !queue.isLocalId(id)) {
        continue;
      }
      byId.set(id, item);
    }
    setSnapshot(sort([...byId.values()]));
    notifyUpdated();
    return snapshot;
  }

  function applyChangeRecords(records: TRemote[]): TLocal[] {
    const byId = new Map(snapshot.map((item) => [maps.getLocalId(item), item]));
    const tombstones = readTombstones();

    for (const remote of records) {
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
      const remoteLocal = maps.dtoToLocal(remote);
      if (!local) {
        byId.set(remote.id, remoteLocal);
        continue;
      }

      const localDto = maps.localToResponseDto(local, getActiveStudioId() ?? "");
      const localMs = Date.parse(localDto.updatedAt);
      const remoteMs = Date.parse(remote.updatedAt);
      if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
        byId.set(remote.id, remoteLocal);
      }
    }

    writeTombstones(tombstones);
    const next = sort(
      [...byId.values()].filter(
        (item) => queue.isLocalId(maps.getLocalId(item)) || !tombstones[maps.getLocalId(item)],
      ),
    );
    setSnapshot(next);
    writeCached(next);
    return next;
  }

  function applyAuthoritativeActiveList(
    remoteActive: TRemote[],
    candidateIdsToTombstone?: ReadonlySet<string>,
  ): TLocal[] {
    const tombstones = readTombstones();
    const remoteIds = new Set(remoteActive.map((item) => item.id));
    const now = new Date().toISOString();
    const byId = new Map(snapshot.map((item) => [maps.getLocalId(item), item]));
    const mayTombstone = (id: string) =>
      !candidateIdsToTombstone || candidateIdsToTombstone.has(id);

    for (const item of [...byId.values()]) {
      const id = maps.getLocalId(item);
      if (queue.isLocalId(id)) {
        continue;
      }
      if (!remoteIds.has(id) && mayTombstone(id)) {
        tombstones[id] = tombstones[id] ?? now;
        byId.delete(id);
      }
    }

    for (const remote of remoteActive) {
      if (remote.deletedAt) {
        continue;
      }
      delete tombstones[remote.id];
      const remoteLocal = maps.dtoToLocal(remote);
      const local = byId.get(remote.id);
      if (!local) {
        byId.set(remote.id, remoteLocal);
        continue;
      }
      const localDto = maps.localToResponseDto(local, getActiveStudioId() ?? "");
      const localMs = Date.parse(localDto.updatedAt);
      const remoteMs = Date.parse(remote.updatedAt);
      if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
        byId.set(remote.id, remoteLocal);
      }
    }

    writeTombstones(tombstones);
    const next = sort(
      [...byId.values()].filter(
        (item) => queue.isLocalId(maps.getLocalId(item)) || !tombstones[maps.getLocalId(item)],
      ),
    );
    setSnapshot(next);
    writeCached(next);
    return next;
  }

  async function loadProductionList(): Promise<TRemote[]> {
    const all = await api.listAll();
    return all.filter((item) => !item.deletedAt);
  }

  async function refreshSnapshot(): Promise<TLocal[]> {
    if (refreshPromise) {
      return refreshPromise;
    }

    const knownIdsBeforeFetch = serverIdsInSnapshot();

    refreshPromise = withTimeout(loadProductionList(), REFRESH_TIMEOUT_MS)
      .then(async (remoteItems) => {
        if (remoteItems.length === 0 && snapshot.length === 0 && options.onFirstEmptyRefresh) {
          await options.onFirstEmptyRefresh();
          remoteItems = await loadProductionList();
        }

        const pendingLocals = snapshot.filter((item) => queue.isLocalId(maps.getLocalId(item)));
        const byId = new Map(remoteItems.map((item) => [item.id, maps.dtoToLocal(item)]));
        for (const local of pendingLocals) {
          byId.set(maps.getLocalId(local), local);
        }
        for (const current of snapshot) {
          const id = maps.getLocalId(current);
          if (!queue.isLocalId(id) && !knownIdsBeforeFetch.has(id) && !byId.has(id)) {
            byId.set(id, current);
          }
        }

        const tombstones = readTombstones();
        const now = new Date().toISOString();
        const remoteIds = new Set(remoteItems.map((item) => item.id));
        for (const priorId of knownIdsBeforeFetch) {
          if (!remoteIds.has(priorId)) {
            tombstones[priorId] = tombstones[priorId] ?? now;
          }
        }
        for (const item of remoteItems) {
          delete tombstones[item.id];
        }
        writeTombstones(tombstones);

        const next = sort(
          [...byId.values()].filter(
            (item) => queue.isLocalId(maps.getLocalId(item)) || !tombstones[maps.getLocalId(item)],
          ),
        );
        setSnapshot(next);
        writeCached(next);
        writeSyncCursor(latestTimestamp(remoteItems.map((item) => item.updatedAt)));
        return next;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  }

  async function reconcileFromApi(): Promise<TLocal[]> {
    if (reconcilePromise) {
      return reconcilePromise;
    }

    reconcilePromise = (async () => {
      const studioId = getActiveStudioId();
      if (!studioId) {
        return snapshot;
      }

      if (!isBrowserOnline()) {
        hydrateFromCache();
        return snapshot;
      }

      if (snapshot.length === 0) {
        hydrateFromCache();
      }

      const cursor = readSyncCursor(studioId);
      if (!cursor) {
        const full = await refreshSnapshot();
        await flushPendingMutations();
        if (options.afterReconcile) {
          await options.afterReconcile();
        }
        notifyUpdated();
        return full;
      }

      let since = cursor;
      let hasMore = true;
      while (hasMore) {
        const page = await withTimeout(api.pullChanges(since), REFRESH_TIMEOUT_MS);
        if (page.records.length > 0) {
          applyChangeRecords(page.records);
        }
        const parsedServer = Date.parse(page.serverTime);
        const parsedSince = Date.parse(since);
        const nextCursor =
          !Number.isNaN(parsedServer) && (Number.isNaN(parsedSince) || parsedServer >= parsedSince)
            ? page.serverTime
            : since;
        writeSyncCursor(nextCursor, studioId);
        since = nextCursor;
        hasMore = page.hasMore;
      }

      const knownIdsBeforeList = serverIdsInSnapshot();
      applyAuthoritativeActiveList(
        await withTimeout(loadProductionList(), REFRESH_TIMEOUT_MS),
        knownIdsBeforeList,
      );

      await flushPendingMutations();
      if (options.afterReconcile) {
        await options.afterReconcile();
      }
      notifyUpdated();
      return snapshot;
    })().finally(() => {
      reconcilePromise = null;
    });

    return reconcilePromise;
  }

  function upsertInSnapshot(item: TLocal): void {
    const id = maps.getLocalId(item);
    const tomb = readTombstones()[id];
    if (tomb && !queue.isLocalId(id)) {
      const tombMs = Date.parse(tomb);
      const itemDto = maps.localToResponseDto(item, getActiveStudioId() ?? "");
      const itemMs = Date.parse(itemDto.updatedAt);
      if (!Number.isNaN(tombMs) && (Number.isNaN(itemMs) || itemMs <= tombMs)) {
        return;
      }
      const tombstones = readTombstones();
      delete tombstones[id];
      writeTombstones(tombstones);
    }

    const next = sort([item, ...snapshot.filter((entry) => maps.getLocalId(entry) !== id)]);
    setSnapshot(next);
    writeCached(next);
  }

  function removeFromSnapshot(id: string): void {
    const next = snapshot.filter((item) => maps.getLocalId(item) !== id);
    setSnapshot(next);
    writeCached(next);
    const tombstones = readTombstones();
    tombstones[id] = new Date().toISOString();
    writeTombstones(tombstones);
  }

  function remapLocalId(localId: string, serverItem: TRemote): void {
    const serverLocal = maps.dtoToLocal(serverItem);
    const withoutLocal = snapshot.filter(
      (item) => maps.getLocalId(item) !== localId && maps.getLocalId(item) !== serverItem.id,
    );
    setSnapshot(sort([serverLocal, ...withoutLocal]));
    writeCached(snapshot);
    queue.removePendingCreate(localId);
    notifyUpdated();
  }

  function enqueueOptimisticCreate(studioId: string, payload: TCreate): TLocal {
    const localId = queue.createLocalId();
    const optimistic = queue.buildOptimisticRecord(localId, payload);
    queue.enqueuePendingCreate({
      localId,
      studioId,
      payload,
      enqueuedAt: new Date().toISOString(),
    });
    upsertInSnapshot(optimistic);
    notifyUpdated();
    return optimistic;
  }

  async function createOfflineAware(payload: TCreate): Promise<TLocal> {
    const studioId = getActiveStudioId();
    if (!studioId) {
      throw new Error("Studio context required");
    }

    const duplicate = options.findDuplicate?.(payload);
    if (duplicate) {
      return duplicate;
    }

    if (!isBrowserOnline()) {
      return enqueueOptimisticCreate(studioId, payload);
    }

    const fingerprint = options.createPayloadFingerprint?.(payload) ?? JSON.stringify(payload);
    const inflight = inFlightCreates.get(fingerprint);
    if (inflight) {
      const created = await inflight;
      return maps.dtoToLocal(created);
    }

    const request = api.create(payload);
    void request.catch(() => undefined);
    inFlightCreates.set(fingerprint, request);

    const createPromise = (async () => {
      try {
        const created = await withTimeout(request, CREATE_TIMEOUT_MS);
        upsertInSnapshot(maps.dtoToLocal(created));
        notifyUpdated();
        return maps.dtoToLocal(created);
      } catch (error) {
        if (!isRetryableSyncFailure(error)) {
          throw error;
        }
        const optimistic = enqueueOptimisticCreate(studioId, payload);
        const optimisticId = maps.getLocalId(optimistic);
        void request
          .then((created) => {
            queue.updatePendingCreate(optimisticId, { serverId: created.id }, studioId);
            remapLocalId(optimisticId, created);
          })
          .catch(() => undefined);
        return optimistic;
      }
    })();

    void request.finally(() => {
      inFlightCreates.delete(fingerprint);
    });

    return createPromise;
  }

  async function updateOfflineAware(id: string, patch: Partial<TLocal>): Promise<TLocal | null> {
    const studioId = getActiveStudioId();
    if (!studioId) {
      throw new Error("Studio context required");
    }

    const current = snapshot.find((item) => maps.getLocalId(item) === id);
    if (!current) {
      return null;
    }

    const updated = { ...current, ...patch } as TLocal;
    upsertInSnapshot(updated);
    notifyUpdated();

    if (queue.isLocalId(id)) {
      return updated;
    }

    const updateDto = maps.patchToUpdateDto(patch);
    if (!isBrowserOnline()) {
      queue.enqueuePendingUpdate?.({
        id,
        studioId,
        payload: updateDto,
        enqueuedAt: new Date().toISOString(),
      });
      return updated;
    }

    try {
      const remote = await withTimeout(api.update(id, updateDto), CREATE_TIMEOUT_MS);
      upsertInSnapshot(maps.dtoToLocal(remote));
      notifyUpdated();
      return maps.dtoToLocal(remote);
    } catch (error) {
      if (!isRetryableSyncFailure(error)) {
        throw error;
      }
      queue.enqueuePendingUpdate?.({
        id,
        studioId,
        payload: updateDto,
        enqueuedAt: new Date().toISOString(),
      });
      return updated;
    }
  }

  async function deleteOfflineAware(id: string): Promise<boolean> {
    const studioId = getActiveStudioId();
    if (!studioId) {
      throw new Error("Studio context required");
    }

    if (!snapshot.some((item) => maps.getLocalId(item) === id)) {
      return false;
    }

    removeFromSnapshot(id);
    notifyUpdated();

    if (queue.isLocalId(id)) {
      queue.removePendingCreate(id, studioId);
      return true;
    }

    if (!isBrowserOnline()) {
      queue.enqueuePendingDelete?.({
        id,
        studioId,
        enqueuedAt: new Date().toISOString(),
      });
      return true;
    }

    try {
      await withTimeout(api.delete(id), CREATE_TIMEOUT_MS);
      return true;
    } catch (error) {
      if (!isRetryableSyncFailure(error)) {
        throw error;
      }
      queue.enqueuePendingDelete?.({
        id,
        studioId,
        enqueuedAt: new Date().toISOString(),
      });
      return true;
    }
  }

  async function flushPendingMutations(): Promise<void> {
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

      for (const entry of queue.listPendingCreates(studioId)) {
        try {
          const fingerprint =
            options.createPayloadFingerprint?.(entry.payload) ?? JSON.stringify(entry.payload);
          const inflight = inFlightCreates.get(fingerprint);
          if (inflight) {
            try {
              const created = await inflight;
              queue.updatePendingCreate(entry.localId, { serverId: created.id }, studioId);
              remapLocalId(entry.localId, created);
            } catch {
              // Keep queued.
            }
            continue;
          }

          if (entry.serverId) {
            const existing = snapshot.find((item) => maps.getLocalId(item) === entry.serverId);
            if (existing && api.get) {
              try {
                const fetched = await api.get(entry.serverId);
                remapLocalId(entry.localId, fetched);
                continue;
              } catch {
                // Fall through.
              }
            }
          }

          const duplicate = options.findDuplicate?.(entry.payload, entry.localId);
          if (duplicate) {
            const duplicateId = maps.getLocalId(duplicate);
            queue.updatePendingCreate(entry.localId, { serverId: duplicateId }, studioId);
            if (api.get) {
              try {
                const fetched = await api.get(duplicateId);
                remapLocalId(entry.localId, fetched);
                continue;
              } catch {
                remapLocalId(entry.localId, maps.localToResponseDto(duplicate, studioId));
                continue;
              }
            }
            remapLocalId(entry.localId, maps.localToResponseDto(duplicate, studioId));
            continue;
          }

          const created = await withTimeout(api.create(entry.payload), CREATE_TIMEOUT_MS);
          queue.updatePendingCreate(entry.localId, { serverId: created.id }, studioId);
          remapLocalId(entry.localId, created);
        } catch {
          // Leave queued.
        }
      }

      for (const entry of queue.listPendingUpdates?.(studioId) ?? []) {
        try {
          const remote = await withTimeout(api.update(entry.id, entry.payload), CREATE_TIMEOUT_MS);
          upsertInSnapshot(maps.dtoToLocal(remote));
          queue.removePendingUpdate?.(entry.id, studioId);
        } catch {
          // Keep queued.
        }
      }

      for (const entry of queue.listPendingDeletes?.(studioId) ?? []) {
        try {
          await withTimeout(api.delete(entry.id), CREATE_TIMEOUT_MS);
          queue.removePendingDelete?.(entry.id, studioId);
        } catch {
          // Keep queued.
        }
      }
    })().finally(() => {
      flushPromise = null;
    });

    return flushPromise;
  }

  return {
    getSnapshot,
    setSnapshot,
    hydrateFromCache,
    reconcileFromApi,
    refreshSnapshot,
    applyChangeRecords,
    applyAuthoritativeActiveList,
    upsertInSnapshot,
    removeFromSnapshot,
    remapLocalId,
    createOfflineAware,
    updateOfflineAware,
    deleteOfflineAware,
    flushPendingMutations,
    readSyncCursor,
    writeSyncCursor,
    readCached,
    writeCached,
    readTombstones,
  };
}
