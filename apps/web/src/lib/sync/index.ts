/**
 * Shared sync utilities for entity-specific stores under `lib/{entity}/`.
 * Each entity owns its cache, cursor, tombstones, and offline queue in its own module.
 */
export {
  getActiveStudioId,
  readStudioScopedItem,
  studioScopedKey,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";

export {
  isBrowserOnline,
  isRetryableClientSyncFailure as isRetryableSyncFailure,
  withTimeout,
} from "@/lib/clients/network";
