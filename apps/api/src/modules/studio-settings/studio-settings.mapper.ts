import type { StudioSettingsResponseDto } from "@st-manager/contracts";
import type { StudioSettings } from "@st-manager/types";

export function toStudioSettingsResponseDto(settings: StudioSettings): StudioSettingsResponseDto {
  return {
    id: settings.id,
    studioId: settings.studioId,
    profile: settings.profile,
    whatsapp: settings.whatsapp,
    deletedAt: settings.deletedAt ? settings.deletedAt.toISOString() : null,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export const EMPTY_STUDIO_SETTINGS_JSON = {
  profile: {},
  whatsapp: {},
} as const;

function normalizeJsonField(raw: unknown): unknown {
  return raw ?? {};
}

export function normalizeStudioSettingsJson(row: {
  profile: unknown;
  whatsapp: unknown;
}): { profile: unknown; whatsapp: unknown } {
  return {
    profile: normalizeJsonField(row.profile),
    whatsapp: normalizeJsonField(row.whatsapp),
  };
}
