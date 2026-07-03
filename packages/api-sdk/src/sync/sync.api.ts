import { ROUTES } from "@st-manager/constants";
import type {
  SyncStudiosPullQueryDto,
  SyncStudiosPullResponseDataDto,
  SyncStudiosPullResponseDto,
  SyncStudiosPushRequestDto,
  SyncStudiosPushResponseDataDto,
  SyncStudiosPushResponseDto,
} from "@st-manager/contracts";
import { syncStudiosPullQuerySchema, syncStudiosPushSchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface SyncApi {
  pushStudios(input: SyncStudiosPushRequestDto): Promise<SyncStudiosPushResponseDataDto>;
  pullStudios(query?: SyncStudiosPullQueryDto): Promise<SyncStudiosPullResponseDataDto>;
}

export function createSyncApi(client: HttpClient): SyncApi {
  return {
    pushStudios: async (input) => {
      const validated = syncStudiosPushSchema.parse(input);
      const response = await client.post<SyncStudiosPushResponseDto>(
        `${ROUTES.SYNC}/studios/push`,
        validated,
      );
      return response.data;
    },

    pullStudios: async (query) => {
      const validated = syncStudiosPullQuerySchema.parse(query ?? {});
      const response = await client.get<SyncStudiosPullResponseDto>(`${ROUTES.SYNC}/studios`, validated);
      return response.data;
    },
  };
}
