export const CLIENT_PORTAL_SETTINGS_UPDATED_EVENT = "st-manager-client-portal-settings-updated";

export function notifyClientPortalSettingsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CLIENT_PORTAL_SETTINGS_UPDATED_EVENT));
  }
}
