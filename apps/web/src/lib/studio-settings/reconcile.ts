import { createSyncReconcileRunner } from "@/lib/sync/reconcile-runner";

import {
  flushPendingStudioSettingsUpdates,
  hydrateStudioSettingsFromCache,
  reconcileStudioSettingsFromApi,
} from "./store";

const runner = createSyncReconcileRunner({
  hydrateFromCache: hydrateStudioSettingsFromCache,
  reconcileFromApi: reconcileStudioSettingsFromApi,
  flushPending: flushPendingStudioSettingsUpdates,
});

export const startStudioSettingsApiSync = runner.start;
export const stopStudioSettingsApiSync = runner.stop;
export const requestStudioSettingsApiReconcile = runner.request;
