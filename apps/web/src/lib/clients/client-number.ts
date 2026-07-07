const CLIENT_NUMBERS_KEY = "st-manager-client-numbers";

type ClientNumberRegistry = Record<string, string>;

function readRegistry(): ClientNumberRegistry {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(CLIENT_NUMBERS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as ClientNumberRegistry;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeRegistry(registry: ClientNumberRegistry): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(CLIENT_NUMBERS_KEY, JSON.stringify(registry));
}

function parseClientNumber(value: string): number {
  const match = value.match(/^CL-(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** Returns a stable display ID such as CL-0001 for an API client record. */
export function getClientDisplayNumber(clientId: string | undefined): string {
  if (!clientId?.trim()) {
    return "";
  }

  const registry = readRegistry();
  const existing = registry[clientId];
  if (existing) {
    return existing;
  }

  const max = Object.values(registry).reduce((acc, value) => Math.max(acc, parseClientNumber(value)), 0);
  const next = `CL-${String(max + 1).padStart(4, "0")}`;
  registry[clientId] = next;
  writeRegistry(registry);
  return next;
}
