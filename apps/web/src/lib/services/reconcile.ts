import { createSyncReconcileRunner } from "@/lib/sync/reconcile-runner";

import {
  flushPendingServiceMutations,
  hydrateServicesSnapshotFromCache,
  reconcileServicesFromApi,
} from "./store";

const runner = createSyncReconcileRunner({
  hydrateFromCache: hydrateServicesSnapshotFromCache,
  reconcileFromApi: reconcileServicesFromApi,
  flushPending: flushPendingServiceMutations,
});

export const startStudioServicesApiSync = runner.start;
export const stopStudioServicesApiSync = runner.stop;
export const requestStudioServicesApiReconcile = runner.request;
