export const WHATSAPP_SETTINGS_UPDATED_EVENT = "st-manager-whatsapp-settings-updated";

export function notifyWhatsAppSettingsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WHATSAPP_SETTINGS_UPDATED_EVENT));
  }
}
