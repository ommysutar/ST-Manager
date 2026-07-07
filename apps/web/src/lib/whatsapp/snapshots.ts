import type { WhatsAppSettings } from "./types";

let settingsSnapshot: WhatsAppSettings | null = null;

export function getWhatsAppSettingsSnapshot(): WhatsAppSettings | null {
  return settingsSnapshot;
}

export function setWhatsAppSettingsSnapshot(settings: WhatsAppSettings): void {
  settingsSnapshot = settings;
}
