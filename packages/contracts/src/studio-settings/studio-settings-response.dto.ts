import type { StudioSettings } from "@st-manager/types";

export interface StudioSettingsResponseDto
  extends Omit<StudioSettings, "createdAt" | "updatedAt" | "deletedAt"> {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
