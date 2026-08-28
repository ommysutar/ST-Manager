import { createSyncReconcileRunner } from "@/lib/sync/reconcile-runner";

import {
  flushPendingSlotMutations,
  hydrateSlotsSnapshotFromCache,
  reconcileSlotsFromApi,
} from "./store";

const runner = createSyncReconcileRunner({
  hydrateFromCache: hydrateSlotsSnapshotFromCache,
  reconcileFromApi: reconcileSlotsFromApi,
  flushPending: flushPendingSlotMutations,
});

export const startBookingSlotDefinitionsApiSync = runner.start;
export const stopBookingSlotDefinitionsApiSync = runner.stop;
export const requestBookingSlotDefinitionsApiReconcile = runner.request;
