export const EVENT_NAMES = {
  STUDIO_CREATED_LOCALLY: "StudioCreatedLocally",
  STUDIO_SYNC_PUSH_SUCCEEDED: "StudioSyncPushSucceeded",
  STUDIO_SYNC_PUSH_FAILED: "StudioSyncPushFailed",
  SYNC_PULL_COMPLETED: "SyncPullCompleted",
  SYNC_CYCLE_COMPLETED: "SyncCycleCompleted",
} as const;

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];
