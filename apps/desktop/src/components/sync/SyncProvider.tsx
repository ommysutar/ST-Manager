import { useEffect } from "react";

import { useAuth } from "../../hooks/useAuth";
import { startSyncEngine } from "../../lib/sync-engine";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    return startSyncEngine(isAuthenticated);
  }, [isAuthenticated]);

  return children;
}
