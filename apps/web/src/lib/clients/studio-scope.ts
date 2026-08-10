import { getAuthUserSnapshot } from "@/lib/token-store";

/** Resolve the authenticated studio id used for client cache / offline queue scoping. */
export function getActiveStudioId(): string | null {
  const user = getAuthUserSnapshot();
  const studioId = user?.studioId?.trim();
  return studioId ? studioId : null;
}

export function studioScopedKey(baseKey: string, studioId: string | null = getActiveStudioId()): string {
  if (!studioId) {
    return baseKey;
  }
  return `${baseKey}::${studioId}`;
}

export function readStudioScopedItem(
  baseKey: string,
  studioId: string | null = getActiveStudioId(),
): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const scoped = studioScopedKey(baseKey, studioId);
    const scopedValue = window.localStorage.getItem(scoped);
    if (scopedValue != null) {
      return scopedValue;
    }
    if (studioId) {
      const legacy = window.localStorage.getItem(baseKey);
      if (legacy != null) {
        window.localStorage.setItem(scoped, legacy);
        return legacy;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStudioScopedItem(
  baseKey: string,
  value: string,
  studioId: string | null = getActiveStudioId(),
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(studioScopedKey(baseKey, studioId), value);
  } catch {
    // ignore quota / private mode
  }
}
