import { EVENT_NAMES, type EventName } from "@st-manager/events";
import type {
  StudioCreatedLocallyPayload,
  StudioSyncPushFailedPayload,
  StudioSyncPushSucceededPayload,
  SyncCycleCompletedPayload,
  SyncPullCompletedPayload,
} from "@st-manager/events";

import { syncApi } from "./api-client";
import { tokenStore } from "./token-store";
import {
  getStudiosLastPulledAt,
  listPendingStudios,
  markStudioSyncFailed,
  markStudiosSynced,
  mergePulledStudios,
  setStudiosLastPulledAt,
} from "./tauri/studios";

export type SyncEngineState = "idle" | "syncing" | "error";

type SyncEventListener = (name: EventName, payload: unknown) => void;
type SyncStateListener = () => void;

let engineState: SyncEngineState = "idle";
let syncInFlight = false;
const eventListeners = new Set<SyncEventListener>();
const stateListeners = new Set<SyncStateListener>();

function emitEvent(name: EventName, payload: unknown): void {
  for (const listener of eventListeners) {
    listener(name, payload);
  }
}

function notifyState(): void {
  for (const listener of stateListeners) {
    listener();
  }
}

function setEngineState(state: SyncEngineState): void {
  engineState = state;
  notifyState();
}

export function getSyncEngineState(): SyncEngineState {
  return engineState;
}

export function subscribeSyncEvents(listener: SyncEventListener): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

export function subscribeSyncEngineState(listener: SyncStateListener): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

async function pushPendingStudios(): Promise<{ pushed: number; failed: number }> {
  const pending = await listPendingStudios();
  if (pending.length === 0) {
    return { pushed: 0, failed: 0 };
  }

  try {
    const response = await syncApi.pushStudios({
      studios: pending.map((studio) => ({
        id: studio.id,
        name: studio.name,
        createdAt: studio.createdAt,
        updatedAt: studio.updatedAt,
      })),
    });

    const succeededIds: string[] = [];

    for (const result of response.results) {
      const studio = pending.find((item) => item.id === result.id);
      if (!studio) {
        continue;
      }

      if (result.status === "created" || result.status === "updated" || result.status === "unchanged") {
        succeededIds.push(result.id);
        emitEvent(EVENT_NAMES.STUDIO_SYNC_PUSH_SUCCEEDED, {
          id: studio.id,
          name: studio.name,
        } satisfies StudioSyncPushSucceededPayload);
      }
    }

    if (succeededIds.length > 0) {
      await markStudiosSynced(succeededIds);
    }

    return { pushed: succeededIds.length, failed: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync push failed";

    for (const studio of pending) {
      await markStudioSyncFailed(studio.id, message).catch(() => undefined);
      emitEvent(EVENT_NAMES.STUDIO_SYNC_PUSH_FAILED, {
        id: studio.id,
        error: message,
      } satisfies StudioSyncPushFailedPayload);
    }

    return { pushed: 0, failed: pending.length };
  }
}

async function pullRemoteStudios(): Promise<number> {
  const since = (await getStudiosLastPulledAt()) ?? undefined;
  const pullResponse = await syncApi.pullStudios(since ? { since } : undefined);
  const mergedCount = await mergePulledStudios(pullResponse.studios);
  await setStudiosLastPulledAt(pullResponse.serverTime);

  emitEvent(EVENT_NAMES.SYNC_PULL_COMPLETED, {
    pulledCount: mergedCount,
    cursor: pullResponse.serverTime,
  } satisfies SyncPullCompletedPayload);

  return mergedCount;
}

export async function runSyncCycle(): Promise<void> {
  if (syncInFlight) {
    return;
  }

  if (!navigator.onLine || !tokenStore.getAccessToken()) {
    return;
  }

  syncInFlight = true;
  setEngineState("syncing");

  let pushed = 0;
  let pulled = 0;
  let failed = 0;

  try {
    const pushResult = await pushPendingStudios();
    pushed = pushResult.pushed;
    failed = pushResult.failed;

    if (pushResult.failed > 0) {
      setEngineState("error");
    } else {
      pulled = await pullRemoteStudios();
      setEngineState("idle");
    }
  } catch {
    failed += 1;
    setEngineState("error");
  } finally {
    emitEvent(EVENT_NAMES.SYNC_CYCLE_COMPLETED, {
      pushed,
      pulled,
      failed,
    } satisfies SyncCycleCompletedPayload);
    syncInFlight = false;
    notifyState();
  }
}

export function requestSync(): void {
  void runSyncCycle();
}

export function startSyncEngine(isAuthenticated: boolean): () => void {
  const handleOnline = () => {
    if (isAuthenticated) {
      requestSync();
    }
  };

  window.addEventListener("online", handleOnline);

  const intervalId = window.setInterval(() => {
    if (document.hasFocus() && navigator.onLine && isAuthenticated) {
      requestSync();
    }
  }, 30_000);

  if (isAuthenticated && navigator.onLine) {
    requestSync();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    window.clearInterval(intervalId);
  };
}

export function emitStudioCreatedLocally(payload: StudioCreatedLocallyPayload): void {
  emitEvent(EVENT_NAMES.STUDIO_CREATED_LOCALLY, payload);
}
