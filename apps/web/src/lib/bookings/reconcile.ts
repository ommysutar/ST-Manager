import { getAuthUserSnapshot, tokenStore } from "@/lib/token-store";

import {
  flushPendingProjectBookingCreates,
  hydrateBookingsSnapshotFromCache,
  reconcileProjectBookingsFromApi,
} from "./store";

const DEFAULT_INTERVAL_MS = 45_000;

let stopFn: (() => void) | null = null;
let intervalTimer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;
let queued = false;

function canSync(): boolean {
  return Boolean(tokenStore.getAccessToken() && getAuthUserSnapshot()?.studioId);
}

async function runReconcile(): Promise<void> {
  if (!canSync()) {
    return;
  }
  if (inFlight) {
    queued = true;
    return;
  }
  inFlight = true;
  try {
    await reconcileProjectBookingsFromApi();
  } catch {
    // Soft-fail — next focus/online/interval retries.
  } finally {
    inFlight = false;
    if (queued) {
      queued = false;
      void runReconcile();
    }
  }
}

/**
 * Near-realtime Project Booking API reconciliation + offline create flush.
 */
export function startProjectBookingApiSync(): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if (stopFn) {
    return stopFn;
  }

  hydrateBookingsSnapshotFromCache();

  const onVisibility = () => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      void runReconcile();
    }
  };
  const onFocus = () => {
    void runReconcile();
  };
  const onOnline = () => {
    void flushPendingProjectBookingCreates().finally(() => {
      void runReconcile();
    });
  };
  const onResume = () => {
    void runReconcile();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onOnline);
  window.addEventListener("pageshow", onResume);

  intervalTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    void runReconcile();
  }, DEFAULT_INTERVAL_MS);

  void runReconcile();

  stopFn = () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("pageshow", onResume);
    if (intervalTimer) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
    stopFn = null;
  };

  return stopFn;
}

export function stopProjectBookingApiSync(): void {
  stopFn?.();
}

export function requestProjectBookingApiReconcile(): Promise<void> {
  return runReconcile();
}
