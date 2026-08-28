import type { AuthUserDto } from "@st-manager/contracts";

import { studioSettingsApi } from "@/lib/api-client";
import {
  getActiveStudioId,
  readStudioScopedItem,
  writeStudioScopedItem,
} from "@/lib/clients/studio-scope";
import { PROFILE_STORAGE_KEY } from "@/lib/profile/types";
import { WHATSAPP_STORAGE_KEY } from "@/lib/whatsapp/types";
import { createDefaultWhatsAppSettings } from "@/lib/whatsapp/constants";
import { isBrowserOnline } from "@/lib/sync";
import { getAuthUserSnapshot } from "@/lib/token-store";

import { buildUpdateDto, profileFromSettingsJson, whatsappFromSettingsJson } from "./map-dto";

const SETTINGS_CACHE_KEY = "st-manager-studio-settings-cache";
const BACKFILL_REPORT_KEY = "st-manager-studio-settings-backfill-report";

export interface LegacyStudioSettingsBackfillReport {
  generatedAt: string;
  studioId: string;
  migratedProfile: boolean;
  migratedWhatsApp: boolean;
  uploaded: boolean;
}

function persistBackfillReport(report: LegacyStudioSettingsBackfillReport): void {
  const studioId = getActiveStudioId();
  if (!studioId) return;
  writeStudioScopedItem(BACKFILL_REPORT_KEY, JSON.stringify(report), studioId);
}

export function migrateLegacyStudioSettingsToStudioCache(): boolean {
  const studioId = getActiveStudioId();
  if (!studioId || typeof window === "undefined") {
    return false;
  }
  if (readStudioScopedItem(SETTINGS_CACHE_KEY, studioId)) {
    return false;
  }
  return false;
}

export async function runLegacyStudioSettingsBackfill(): Promise<LegacyStudioSettingsBackfillReport> {
  const studioId = getActiveStudioId() ?? "unknown";
  const user = getAuthUserSnapshot();

  const report: LegacyStudioSettingsBackfillReport = {
    generatedAt: new Date().toISOString(),
    studioId,
    migratedProfile: false,
    migratedWhatsApp: false,
    uploaded: false,
  };

  if (!studioId || studioId === "unknown" || !user || !isBrowserOnline()) {
    persistBackfillReport(report);
    return report;
  }

  let profileRaw: unknown = null;
  let whatsappRaw: unknown = null;

  if (typeof window !== "undefined") {
    try {
      const legacyProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (legacyProfile) {
        profileRaw = JSON.parse(legacyProfile);
        report.migratedProfile = true;
      }
    } catch {
      // ignore
    }

    try {
      const legacyWhatsapp = window.localStorage.getItem(WHATSAPP_STORAGE_KEY);
      if (legacyWhatsapp) {
        whatsappRaw = JSON.parse(legacyWhatsapp);
        report.migratedWhatsApp = true;
      }
    } catch {
      // ignore
    }
  }

  if (!profileRaw && !whatsappRaw) {
    persistBackfillReport(report);
    return report;
  }

  const remote = await studioSettingsApi.getStudioSettings();
  const remoteProfileEmpty =
    !remote.profile || (typeof remote.profile === "object" && Object.keys(remote.profile).length === 0);
  const remoteWhatsappEmpty =
    !remote.whatsapp ||
    (typeof remote.whatsapp === "object" && Object.keys(remote.whatsapp).length === 0);

  const patch: { profile?: ReturnType<typeof profileFromSettingsJson>; whatsapp?: ReturnType<typeof whatsappFromSettingsJson> } =
    {};

  if (profileRaw && remoteProfileEmpty) {
    patch.profile = profileFromSettingsJson(user as AuthUserDto, profileRaw);
  }

  if (whatsappRaw && remoteWhatsappEmpty) {
    patch.whatsapp = whatsappFromSettingsJson(whatsappRaw);
  } else if (remoteWhatsappEmpty && !whatsappRaw) {
    patch.whatsapp = createDefaultWhatsAppSettings();
  }

  if (patch.profile || patch.whatsapp) {
    try {
      await studioSettingsApi.updateStudioSettings(buildUpdateDto(patch));
      report.uploaded = true;
    } catch {
      // Leave for next reconcile.
    }
  }

  persistBackfillReport(report);
  return report;
}

export function readLastStudioSettingsBackfillReport(): LegacyStudioSettingsBackfillReport | null {
  const studioId = getActiveStudioId();
  if (!studioId) return null;
  try {
    const raw = readStudioScopedItem(BACKFILL_REPORT_KEY, studioId);
    if (!raw) return null;
    return JSON.parse(raw) as LegacyStudioSettingsBackfillReport;
  } catch {
    return null;
  }
}
