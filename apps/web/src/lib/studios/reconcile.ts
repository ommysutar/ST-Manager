import { createSyncReconcileRunner } from "@/lib/sync/reconcile-runner";

import {
  flushPendingRoomMutations,
  hydrateRoomsSnapshotFromCache,
  reconcileRoomsFromApi,
} from "./store";

const runner = createSyncReconcileRunner({
  hydrateFromCache: hydrateRoomsSnapshotFromCache,
  reconcileFromApi: reconcileRoomsFromApi,
  flushPending: flushPendingRoomMutations,
});

export const startStudioRoomsApiSync = runner.start;
export const stopStudioRoomsApiSync = runner.stop;
export const requestStudioRoomsApiReconcile = runner.request;
