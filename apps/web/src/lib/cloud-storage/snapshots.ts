import type { CloudStorageSettings } from "./types";
import { createDefaultCloudSettings } from "./types";

let snapshot: CloudStorageSettings = createDefaultCloudSettings();

export function getCloudStorageSnapshot(): CloudStorageSettings {
  return snapshot;
}

export function setCloudStorageSnapshot(settings: CloudStorageSettings): void {
  snapshot = settings;
}
