import type { StudioLicenseResponseDto } from "@st-manager/contracts";

import type { HttpClient } from "../client/types";

export interface StudioLicenseApi {
  getCurrent(): Promise<StudioLicenseResponseDto["data"]>;
}

export function createStudioLicenseApi(client: HttpClient): StudioLicenseApi {
  return {
    getCurrent: async () => {
      const response = await client.get<StudioLicenseResponseDto>("studio-license");
      return response.data;
    },
  };
}
