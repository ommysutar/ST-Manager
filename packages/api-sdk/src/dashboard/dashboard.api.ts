import { ROUTES } from "@st-manager/constants";
import type {
  DashboardSummaryDataDto,
  DashboardSummaryResponseDto,
} from "@st-manager/contracts";

import type { HttpClient } from "../client/types";

export interface DashboardApi {
  getSummary(): Promise<DashboardSummaryDataDto>;
}

export function createDashboardApi(client: HttpClient): DashboardApi {
  return {
    getSummary: async () => {
      const response = await client.get<DashboardSummaryResponseDto>(`${ROUTES.DASHBOARD}/summary`);
      return response.data;
    },
  };
}
