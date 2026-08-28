import { createDefaultWhatsAppSettings } from "./constants";
import { notifyWhatsAppSettingsUpdated } from "./events";
import { getWhatsAppSettingsSnapshot, setWhatsAppSettingsSnapshot } from "./snapshots";
import {
  flushPendingStudioSettingsUpdates,
  getWhatsAppFromStore,
  hydrateStudioSettingsFromCache,
  updateStudioSettingsOfflineAware,
} from "@/lib/studio-settings/store";
import { whatsappFromSettingsJson } from "@/lib/studio-settings/map-dto";
import { isBrowserOnline } from "@/lib/sync";
import type { WhatsAppNotificationType, WhatsAppSettings, WhatsAppTemplate } from "./types";
import { WHATSAPP_STORAGE_KEY } from "./types";

function readLegacyFromStorage(): WhatsAppSettings {
  if (typeof window === "undefined") {
    return createDefaultWhatsAppSettings();
  }

  try {
    const raw = localStorage.getItem(WHATSAPP_STORAGE_KEY);
    if (!raw) {
      return createDefaultWhatsAppSettings();
    }

    return whatsappFromSettingsJson(JSON.parse(raw));
  } catch {
    return createDefaultWhatsAppSettings();
  }
}

function persist(settings: WhatsAppSettings): WhatsAppSettings {
  const updated: WhatsAppSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  setWhatsAppSettingsSnapshot(updated);
  notifyWhatsAppSettingsUpdated();

  void updateStudioSettingsOfflineAware({ whatsapp: updated }).then(() => {
    if (isBrowserOnline()) {
      void flushPendingStudioSettingsUpdates();
    }
  });

  return updated;
}

export function initializeWhatsAppSettingsSnapshots(): void {
  hydrateStudioSettingsFromCache();
  const settings = getWhatsAppFromStore() ?? readLegacyFromStorage();
  setWhatsAppSettingsSnapshot(settings);
}

export function loadWhatsAppSettings(): WhatsAppSettings {
  hydrateStudioSettingsFromCache();
  const cached = getWhatsAppFromStore() ?? getWhatsAppSettingsSnapshot();
  if (cached) {
    return cached;
  }

  const settings = readLegacyFromStorage();
  setWhatsAppSettingsSnapshot(settings);
  return settings;
}

export function saveWhatsAppSettings(settings: WhatsAppSettings): WhatsAppSettings {
  return persist(settings);
}

export function updateWhatsAppTemplate(
  id: WhatsAppNotificationType,
  patch: Partial<Pick<WhatsAppTemplate, "body" | "enabled">>,
): WhatsAppSettings {
  const current = loadWhatsAppSettings();
  const templates = current.templates.map((template) =>
    template.id === id ? { ...template, ...patch } : template,
  );
  return persist({ ...current, templates });
}

export function getWhatsAppTemplate(id: WhatsAppNotificationType): WhatsAppTemplate | undefined {
  return loadWhatsAppSettings().templates.find((template) => template.id === id);
}

export function isWhatsAppNotificationEnabled(id: WhatsAppNotificationType): boolean {
  return getWhatsAppTemplate(id)?.enabled ?? true;
}
