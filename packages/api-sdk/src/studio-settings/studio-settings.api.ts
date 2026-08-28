import { ROUTES } from "@st-manager/constants";
import type {
  GetStudioSettingsResponseDto,
  StudioSettingsResponseDto,
  SyncStudioSettingsPullQueryDto,
  SyncStudioSettingsPullResponseDto,
  UpdateStudioSettingsDto,
  UpdateStudioSettingsResponseDto,
} from "@st-manager/contracts";
import { updateStudioSettingsSchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface StudioSettingsApi {
  getStudioSettings(): Promise<StudioSettingsResponseDto>;
  updateStudioSettings(input: UpdateStudioSettingsDto): Promise<StudioSettingsResponseDto>;
  pullStudioSettingsChanges(
    query?: SyncStudioSettingsPullQueryDto,
  ): Promise<SyncStudioSettingsPullResponseDto["data"]>;
}

export function createStudioSettingsApi(client: HttpClient): StudioSettingsApi {
  return {
    getStudioSettings: async () => {
      const response = await client.get<GetStudioSettingsResponseDto>(ROUTES.STUDIO_SETTINGS);
      return response.data;
    },

    updateStudioSettings: async (input) => {
      const validated = updateStudioSettingsSchema.parse(input);
      const response = await client.patch<UpdateStudioSettingsResponseDto>(
        ROUTES.STUDIO_SETTINGS,
        validated,
      );
      return response.data;
    },

    pullStudioSettingsChanges: async (query = {}) => {
      const response = await client.get<SyncStudioSettingsPullResponseDto>(
        `${ROUTES.STUDIO_SETTINGS}/changes`,
        { since: query.since },
      );
      return response.data;
    },
  };
}
