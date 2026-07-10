import { ROUTES } from "@st-manager/constants";
import type {
  PlatformAdminDashboardResponseDto,
  PlatformAdminLoginRequestDto,
  PlatformAdminLoginResponseDto,
} from "@st-manager/contracts";
import { loginSchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface PlatformAdminApi {
  login(input: PlatformAdminLoginRequestDto): Promise<PlatformAdminLoginResponseDto["data"]>;
  getDashboard(): Promise<PlatformAdminDashboardResponseDto["data"]>;
}

export function createPlatformAdminApi(client: HttpClient): PlatformAdminApi {
  return {
    login: async (input) => {
      const validated = loginSchema.parse(input);
      const response = await client.post<PlatformAdminLoginResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/auth/login`,
        validated,
      );
      return response.data;
    },

    getDashboard: async () => {
      const response = await client.get<PlatformAdminDashboardResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/dashboard`,
      );
      return response.data;
    },
  };
}
