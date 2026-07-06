import { notifyCloudStorageUpdated } from "./events";
import { getCloudStorageSnapshot, setCloudStorageSnapshot } from "./snapshots";
import {
  CLOUD_STORAGE_KEY,
  createDefaultCloudSettings,
  type CloudProviderConfig,
  type CloudProviderKey,
  type CloudStorageSettings,
} from "./types";

function normalizeProvider(raw: Partial<CloudProviderConfig>): CloudProviderConfig {
  const now = new Date().toISOString();
  const provider = raw.provider ?? "google_drive";
  return {
    provider,
    enabled: raw.enabled ?? false,
    folderId: raw.folderId?.trim() ?? "",
    clientId: raw.clientId?.trim() ?? "",
    clientSecret: raw.clientSecret?.trim() ?? "",
    connected: raw.connected ?? false,
    updatedAt: raw.updatedAt ?? now,
  };
}

function readSettings(): CloudStorageSettings {
  if (typeof window === "undefined") {
    return createDefaultCloudSettings();
  }

  try {
    const raw = localStorage.getItem(CLOUD_STORAGE_KEY);
    if (!raw) {
      return createDefaultCloudSettings();
    }

    const parsed = JSON.parse(raw) as CloudStorageSettings;
    const defaults = createDefaultCloudSettings();
    const byProvider = new Map(
      (parsed.providers ?? []).map((entry) => [entry.provider, normalizeProvider(entry)]),
    );

    return {
      providers: defaults.providers.map(
        (defaultEntry) => byProvider.get(defaultEntry.provider) ?? defaultEntry,
      ),
    };
  } catch {
    return createDefaultCloudSettings();
  }
}

function persist(settings: CloudStorageSettings): CloudStorageSettings {
  localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(settings));
  setCloudStorageSnapshot(settings);
  notifyCloudStorageUpdated();
  return settings;
}

export function loadCloudStorageSettings(): CloudStorageSettings {
  return readSettings();
}

export function getCloudProviderConfig(provider: CloudProviderKey): CloudProviderConfig {
  return (
    readSettings().providers.find((entry) => entry.provider === provider) ??
    createDefaultCloudSettings().providers[0]
  );
}

export function getEnabledCloudProviders(): CloudProviderConfig[] {
  return readSettings().providers.filter((entry) => entry.enabled);
}

export function updateCloudProviderConfig(
  provider: CloudProviderKey,
  patch: Partial<Omit<CloudProviderConfig, "provider">>,
): CloudProviderConfig {
  const settings = readSettings();
  const index = settings.providers.findIndex((entry) => entry.provider === provider);
  if (index === -1) {
    throw new Error("Unknown cloud provider");
  }

  const updated = normalizeProvider({
    ...settings.providers[index],
    ...patch,
    provider,
    updatedAt: new Date().toISOString(),
  });

  settings.providers[index] = updated;
  persist(settings);
  return updated;
}

export function initializeCloudStorageSnapshots(): void {
  setCloudStorageSnapshot(readSettings());
}

export { getCloudStorageSnapshot };
