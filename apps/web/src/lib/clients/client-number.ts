import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "./studio-scope";

const CLIENT_NUMBERS_KEY = "st-manager-client-numbers";

type ClientNumberRegistry = Record<string, string>;

function readRegistry(studioId: string | null = getActiveStudioId()): ClientNumberRegistry {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = readStudioScopedItem(CLIENT_NUMBERS_KEY, studioId);
    if (raw) {
      const parsed = JSON.parse(raw) as ClientNumberRegistry;
      return parsed && typeof parsed === "object" ? parsed : {};
    }

    // One-time migrate from legacy global key into the active studio scope.
    if (studioId) {
      const legacy = window.localStorage.getItem(CLIENT_NUMBERS_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy) as ClientNumberRegistry;
        if (parsed && typeof parsed === "object") {
          writeStudioScopedItem(CLIENT_NUMBERS_KEY, JSON.stringify(parsed), studioId);
          return parsed;
        }
      }
    }
    return {};
  } catch {
    return {};
  }
}

function writeRegistry(
  registry: ClientNumberRegistry,
  studioId: string | null = getActiveStudioId(),
): void {
  if (typeof window === "undefined" || !studioId) {
    return;
  }
  writeStudioScopedItem(CLIENT_NUMBERS_KEY, JSON.stringify(registry), studioId);
}

function parseClientNumber(value: string): number {
  const match = value.match(/^CL-(\d+)$/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/**
 * Prefer the server-backed display number when present.
 * Falls back to a studio-scoped local registry only for offline local ids.
 */
export function getClientDisplayNumber(
  clientId: string | undefined,
  serverDisplayNumber?: string | null,
): string {
  const server = serverDisplayNumber?.trim();
  if (server) {
    if (clientId?.trim()) {
      rememberClientDisplayNumber(clientId, server);
    }
    return server;
  }

  if (!clientId?.trim()) {
    return "";
  }

  const registry = readRegistry();
  const existing = registry[clientId];
  if (existing) {
    return existing;
  }

  // Do not invent numbers for server ids — wait for API displayNumber.
  if (!clientId.startsWith("local_cli_")) {
    return "";
  }

  const max = Object.values(registry).reduce(
    (acc, value) => Math.max(acc, parseClientNumber(value)),
    0,
  );
  const next = `CL-${String(max + 1).padStart(4, "0")}`;
  registry[clientId] = next;
  writeRegistry(registry);
  return next;
}

/** Cache a server display number locally so remaps / offline UI stay stable. */
export function rememberClientDisplayNumber(clientId: string, displayNumber: string): void {
  if (!clientId.trim() || !displayNumber.trim()) {
    return;
  }
  const registry = readRegistry();
  if (registry[clientId] === displayNumber) {
    return;
  }
  registry[clientId] = displayNumber;
  writeRegistry(registry);
}

/** Transfer a display number when an offline local client id is replaced by the server id. */
export function remapClientDisplayNumber(localId: string, serverId: string): void {
  if (!localId.trim() || !serverId.trim() || localId === serverId) {
    return;
  }
  const registry = readRegistry();
  const existing = registry[localId];
  if (!existing) {
    return;
  }
  if (!registry[serverId]) {
    registry[serverId] = existing;
  }
  delete registry[localId];
  writeRegistry(registry);
}
