export const CLOUD_STORAGE_UPDATED_EVENT = "st-manager-cloud-storage-updated";

export function notifyCloudStorageUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CLOUD_STORAGE_UPDATED_EVENT));
  }
}
