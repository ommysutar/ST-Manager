import { createDefaultWhatsAppSettings } from "./constants";
import { notifyWhatsAppSettingsUpdated } from "./events";
import { getWhatsAppSettingsSnapshot, setWhatsAppSettingsSnapshot } from "./snapshots";
import type { WhatsAppNotificationType, WhatsAppSettings, WhatsAppTemplate } from "./types";
import { WHATSAPP_STORAGE_KEY } from "./types";

function readFromStorage(): WhatsAppSettings {
  if (typeof window === "undefined") {
    return createDefaultWhatsAppSettings();
  }

  try {
    const raw = localStorage.getItem(WHATSAPP_STORAGE_KEY);
    if (!raw) {
      return createDefaultWhatsAppSettings();
    }

    const parsed = JSON.parse(raw) as WhatsAppSettings;
    const defaults = createDefaultWhatsAppSettings();
    const templateMap = new Map(parsed.templates.map((template) => [template.id, template]));

    return {
      ...defaults,
      ...parsed,
      templates: defaults.templates.map((defaultTemplate) => {
        const saved = templateMap.get(defaultTemplate.id);
        return saved
          ? {
              ...defaultTemplate,
              ...saved,
              label: defaultTemplate.label,
            }
          : defaultTemplate;
      }),
    };
  } catch {
    return createDefaultWhatsAppSettings();
  }
}

function persist(settings: WhatsAppSettings): WhatsAppSettings {
  const updated: WhatsAppSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(WHATSAPP_STORAGE_KEY, JSON.stringify(updated));
  }

  setWhatsAppSettingsSnapshot(updated);
  notifyWhatsAppSettingsUpdated();
  return updated;
}

export function initializeWhatsAppSettingsSnapshots(): void {
  const settings = readFromStorage();
  setWhatsAppSettingsSnapshot(settings);
}

export function loadWhatsAppSettings(): WhatsAppSettings {
  const cached = getWhatsAppSettingsSnapshot();
  if (cached) {
    return cached;
  }

  const settings = readFromStorage();
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
