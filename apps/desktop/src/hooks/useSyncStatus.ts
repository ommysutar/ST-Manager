import { useCallback, useEffect, useState } from "react";

import {
  getSyncEngineState,
  requestSync,
  subscribeSyncEngineState,
  type SyncEngineState,
} from "../lib/sync-engine";
import { getSyncStatus, type SyncStatusDto } from "../lib/tauri/studios";

export function useSyncStatus(isAuthenticated: boolean) {
  const [syncStatus, setSyncStatus] = useState<SyncStatusDto | null>(null);
  const [engineState, setEngineState] = useState<SyncEngineState>(() => getSyncEngineState());
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const loadSyncStatus = useCallback(() => {
    getSyncStatus()
      .then((status) => {
        setSyncStatus(status);
      })
      .catch(() => {
        setSyncStatus(null);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    getSyncStatus()
      .then((status) => {
        if (!cancelled) {
          setSyncStatus(status);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSyncStatus(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [engineState, isOnline]);

  useEffect(() => {
    return subscribeSyncEngineState(() => {
      setEngineState(getSyncEngineState());
      loadSyncStatus();
    });
  }, [loadSyncStatus]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const syncNow = useCallback(() => {
    if (isAuthenticated && isOnline) {
      requestSync();
    }
  }, [isAuthenticated, isOnline]);

  return {
    syncStatus,
    engineState,
    isOnline,
    syncNow,
  };
}
