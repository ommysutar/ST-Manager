import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";

import type {
  PendingCreateEntry,
  PendingDeleteEntry,
  PendingUpdateEntry,
} from "./list-entity-store";

export interface OfflineQueueConfig {
  pendingCreatesKey: string;
  pendingUpdatesKey: string;
  pendingDeletesKey: string;
  localIdPrefix: string;
}

export function createOfflineQueue<TCreate, TUpdate, TLocal>(config: OfflineQueueConfig & {
  buildOptimisticRecord: (localId: string, payload: TCreate) => TLocal;
}) {
  const { pendingCreatesKey, pendingUpdatesKey, pendingDeletesKey, localIdPrefix } = config;

  function isLocalId(id: string): boolean {
    return id.startsWith(localIdPrefix);
  }

  function createLocalId(): string {
    const rand =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    return `${localIdPrefix}${rand}`;
  }

  function readCreates(studioId: string | null = getActiveStudioId()): PendingCreateEntry<TCreate>[] {
    if (!studioId) return [];
    try {
      const raw = readStudioScopedItem(pendingCreatesKey, studioId);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PendingCreateEntry<TCreate>[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeCreates(
    queue: PendingCreateEntry<TCreate>[],
    studioId: string | null = getActiveStudioId(),
  ): void {
    if (!studioId) return;
    writeStudioScopedItem(pendingCreatesKey, JSON.stringify(queue), studioId);
  }

  function readUpdates(studioId: string | null = getActiveStudioId()): PendingUpdateEntry<TUpdate>[] {
    if (!studioId) return [];
    try {
      const raw = readStudioScopedItem(pendingUpdatesKey, studioId);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PendingUpdateEntry<TUpdate>[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeUpdates(
    queue: PendingUpdateEntry<TUpdate>[],
    studioId: string | null = getActiveStudioId(),
  ): void {
    if (!studioId) return;
    writeStudioScopedItem(pendingUpdatesKey, JSON.stringify(queue), studioId);
  }

  function readDeletes(studioId: string | null = getActiveStudioId()): PendingDeleteEntry[] {
    if (!studioId) return [];
    try {
      const raw = readStudioScopedItem(pendingDeletesKey, studioId);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PendingDeleteEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeDeletes(
    queue: PendingDeleteEntry[],
    studioId: string | null = getActiveStudioId(),
  ): void {
    if (!studioId) return;
    writeStudioScopedItem(pendingDeletesKey, JSON.stringify(queue), studioId);
  }

  return {
    isLocalId,
    createLocalId,
    listPendingCreates: readCreates,
    enqueuePendingCreate: (entry: PendingCreateEntry<TCreate>) => {
      const queue = readCreates(entry.studioId).filter((item) => item.localId !== entry.localId);
      queue.push(entry);
      writeCreates(queue, entry.studioId);
    },
    updatePendingCreate: (
      localId: string,
      patch: Partial<PendingCreateEntry<TCreate>>,
      studioId: string | null = getActiveStudioId(),
    ) => {
      writeCreates(
        readCreates(studioId).map((item) =>
          item.localId === localId ? { ...item, ...patch } : item,
        ),
        studioId,
      );
    },
    removePendingCreate: (localId: string, studioId: string | null = getActiveStudioId()) => {
      writeCreates(
        readCreates(studioId).filter((item) => item.localId !== localId),
        studioId,
      );
    },
    buildOptimisticRecord: config.buildOptimisticRecord,
    listPendingUpdates: readUpdates,
    enqueuePendingUpdate: (entry: PendingUpdateEntry<TUpdate>) => {
      const queue = readUpdates(entry.studioId).filter((item) => item.id !== entry.id);
      queue.push(entry);
      writeUpdates(queue, entry.studioId);
    },
    removePendingUpdate: (id: string, studioId: string | null = getActiveStudioId()) => {
      writeUpdates(
        readUpdates(studioId).filter((item) => item.id !== id),
        studioId,
      );
    },
    listPendingDeletes: readDeletes,
    enqueuePendingDelete: (entry: PendingDeleteEntry) => {
      const queue = readDeletes(entry.studioId).filter((item) => item.id !== entry.id);
      queue.push(entry);
      writeDeletes(queue, entry.studioId);
    },
    removePendingDelete: (id: string, studioId: string | null = getActiveStudioId()) => {
      writeDeletes(
        readDeletes(studioId).filter((item) => item.id !== id),
        studioId,
      );
    },
  };
}
