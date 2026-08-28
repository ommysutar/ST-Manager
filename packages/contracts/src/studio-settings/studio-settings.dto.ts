import type { StudioSettingsResponseDto } from "./studio-settings-response.dto";

export type GetStudioSettingsResponseDto = {
  success: true;
  data: StudioSettingsResponseDto;
};

export type UpdateStudioSettingsResponseDto = {
  success: true;
  data: StudioSettingsResponseDto;
};

/** Incremental studio settings sync pull (studio-scoped; includes soft-deletes). */
export interface SyncStudioSettingsPullQueryDto {
  since?: string;
}

export interface SyncStudioSettingsPullResponseDataDto {
  records: StudioSettingsResponseDto[];
  serverTime: string;
  hasMore: boolean;
}

export type SyncStudioSettingsPullResponseDto = {
  success: true;
  data: SyncStudioSettingsPullResponseDataDto;
};
