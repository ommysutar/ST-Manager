import { ROUTES } from "@st-manager/constants";
import type {
  GetStudioUserProfileResponseDto,
  StudioUserProfileDto,
  UpdateStudioUserProfileRequestDto,
  UpdateStudioUserProfileResponseDto,
} from "@st-manager/contracts";
import { updateStudioUserProfileSchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface StudioProfileApi {
  getProfile(): Promise<StudioUserProfileDto>;
  updateProfile(input: UpdateStudioUserProfileRequestDto): Promise<StudioUserProfileDto>;
}

export function createStudioProfileApi(client: HttpClient): StudioProfileApi {
  return {
    getProfile: async () => {
      const response = await client.get<GetStudioUserProfileResponseDto>(ROUTES.PROFILE);
      return response.data;
    },

    updateProfile: async (input) => {
      const validated = updateStudioUserProfileSchema.parse(input);
      const response = await client.patch<UpdateStudioUserProfileResponseDto>(ROUTES.PROFILE, validated);
      return response.data;
    },
  };
}
