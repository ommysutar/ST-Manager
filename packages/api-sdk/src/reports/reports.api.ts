import { ROUTES } from "@st-manager/constants";
import type {
  ClientActivityReportResponseDto,
  RevenueReportResponseDto,
  UtilizationReportResponseDto,
} from "@st-manager/contracts";
import { reportsDateRangeQuerySchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface ReportsDateRangeQuery {
  from: string;
  to: string;
}

export interface ReportsApi {
  getRevenueReport(query: ReportsDateRangeQuery): Promise<RevenueReportResponseDto["data"]>;
  getUtilizationReport(query: ReportsDateRangeQuery): Promise<UtilizationReportResponseDto["data"]>;
  getClientActivityReport(
    query: ReportsDateRangeQuery,
  ): Promise<ClientActivityReportResponseDto["data"]>;
  getRevenueCsv(query: ReportsDateRangeQuery): Promise<string>;
}

export function createReportsApi(client: HttpClient): ReportsApi {
  return {
    getRevenueReport: async (query) => {
      const validated = reportsDateRangeQuerySchema.parse(query);
      const response = await client.get<RevenueReportResponseDto>(
        `${ROUTES.REPORTS}/revenue`,
        validated,
      );
      return response.data;
    },

    getUtilizationReport: async (query) => {
      const validated = reportsDateRangeQuerySchema.parse(query);
      const response = await client.get<UtilizationReportResponseDto>(
        `${ROUTES.REPORTS}/utilization`,
        validated,
      );
      return response.data;
    },

    getClientActivityReport: async (query) => {
      const validated = reportsDateRangeQuerySchema.parse(query);
      const response = await client.get<ClientActivityReportResponseDto>(
        `${ROUTES.REPORTS}/clients`,
        validated,
      );
      return response.data;
    },

    getRevenueCsv: (query) => {
      const validated = reportsDateRangeQuerySchema.parse(query);
      return client.getText(`${ROUTES.REPORTS}/revenue/export`, validated);
    },
  };
}
