export type CloudProviderKey = "google_drive" | "dropbox" | "onedrive";

export interface CloudProviderConfig {
  provider: CloudProviderKey;
  enabled: boolean;
  folderId: string;
  /** OAuth / API placeholders — not wired in V1. */
  clientId: string;
  clientSecret: string;
  connected: boolean;
  updatedAt: string;
}

export interface CloudStorageSettings {
  providers: CloudProviderConfig[];
}

export const CLOUD_STORAGE_KEY = "st-manager-cloud-config";

export const CLOUD_PROVIDER_LABELS: Record<CloudProviderKey, string> = {
  google_drive: "Google Drive",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
};

export function createDefaultCloudSettings(): CloudStorageSettings {
  const now = new Date().toISOString();
  const providers: CloudProviderKey[] = ["google_drive", "dropbox", "onedrive"];

  return {
    providers: providers.map((provider) => ({
      provider,
      enabled: false,
      folderId: "",
      clientId: "",
      clientSecret: "",
      connected: false,
      updatedAt: now,
    })),
  };
}
