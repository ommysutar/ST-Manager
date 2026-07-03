export interface StudioCreatedLocallyPayload {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudioSyncPushSucceededPayload {
  id: string;
  name: string;
}

export interface StudioSyncPushFailedPayload {
  id: string;
  error: string;
}

export interface SyncPullCompletedPayload {
  pulledCount: number;
  cursor: string;
}

export interface SyncCycleCompletedPayload {
  pushed: number;
  pulled: number;
  failed: number;
}
