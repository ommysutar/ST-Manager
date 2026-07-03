import { Button } from "@st-manager/ui";

import { useAuth } from "../../hooks/useAuth";
import { useSyncStatus } from "../../hooks/useSyncStatus";

function statusLabel(
  isOnline: boolean,
  engineState: "idle" | "syncing" | "error",
  pendingCount: number,
): string {
  if (!isOnline) {
    return "Offline";
  }

  if (engineState === "syncing") {
    return "Syncing…";
  }

  if (engineState === "error") {
    return pendingCount > 0 ? `${pendingCount} pending (sync failed)` : "Sync failed";
  }

  if (pendingCount > 0) {
    return `${pendingCount} pending`;
  }

  return "Synced";
}

export function SyncStatusIndicator() {
  const { isAuthenticated } = useAuth();
  const { syncStatus, engineState, isOnline, syncNow } = useSyncStatus(isAuthenticated);
  const pendingCount = syncStatus?.pendingCount ?? 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {statusLabel(isOnline, engineState, pendingCount)}
      </span>
      {isAuthenticated && isOnline ? (
        <Button type="button" variant="outline" size="sm" onClick={syncNow} disabled={engineState === "syncing"}>
          Sync now
        </Button>
      ) : null}
    </div>
  );
}
