import { ROUTES } from "@st-manager/constants";
import type {
  PlatformAdminDashboardResponseDto,
  PlatformAdminLoginRequestDto,
  PlatformAdminLoginResponseDto,
  PlatformAuditLogListResponseDto,
  PlatformDeleteStudioRequestDto,
  PlatformStudioActionResponseDto,
  PlatformStudioDetailResponseDto,
  PlatformStudioListQueryDto,
  PlatformStudioListResponseDto,
} from "@st-manager/contracts";
import {
  loginSchema,
  platformDeleteStudioSchema,
  platformStudioListQuerySchema,
} from "@st-manager/validation";

import type { HttpClient, QueryParams } from "../client/types";

export interface PlatformAdminApi {
  login(input: PlatformAdminLoginRequestDto): Promise<PlatformAdminLoginResponseDto["data"]>;
  getDashboard(): Promise<PlatformAdminDashboardResponseDto["data"]>;
  listStudios(query?: PlatformStudioListQueryDto): Promise<PlatformStudioListResponseDto>;
  getStudio(id: string): Promise<PlatformStudioDetailResponseDto["data"]>;
  disableStudio(id: string): Promise<PlatformStudioActionResponseDto["data"]>;
  enableStudio(id: string): Promise<PlatformStudioActionResponseDto["data"]>;
  deleteStudio(id: string, input: PlatformDeleteStudioRequestDto): Promise<PlatformStudioActionResponseDto["data"]>;
  listAuditLogs(): Promise<PlatformAuditLogListResponseDto["data"]>;
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

    listStudios: async (query = {}) => {
      const validated = platformStudioListQuerySchema.parse(query);
      return client.get<PlatformStudioListResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/studios`,
        validated as QueryParams,
      );
    },

    getStudio: async (id) => {
      const response = await client.get<PlatformStudioDetailResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/studios/${encodeURIComponent(id)}`,
      );
      return response.data;
    },

    disableStudio: async (id) => {
      const response = await client.post<PlatformStudioActionResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/studios/${encodeURIComponent(id)}/disable`,
        {},
      );
      return response.data;
    },

    enableStudio: async (id) => {
      const response = await client.post<PlatformStudioActionResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/studios/${encodeURIComponent(id)}/enable`,
        {},
      );
      return response.data;
    },

    deleteStudio: async (id, input) => {
      const validated = platformDeleteStudioSchema.parse(input);
      const response = await client.post<PlatformStudioActionResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/studios/${encodeURIComponent(id)}/delete`,
        validated,
      );
      return response.data;
    },

    listAuditLogs: async () => {
      const response = await client.get<PlatformAuditLogListResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/audit-logs`,
      );
      return response.data;
    },
  };
}
