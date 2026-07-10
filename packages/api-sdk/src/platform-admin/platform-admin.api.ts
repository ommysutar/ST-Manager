import { ROUTES } from "@st-manager/constants";
import type {
  PlatformActivationCodeActionResponseDto,
  PlatformActivationCodeListQueryDto,
  PlatformActivationCodeListResponseDto,
  PlatformActivationCodesExportResponseDto,
  PlatformAdminDashboardResponseDto,
  PlatformAdminLoginRequestDto,
  PlatformAdminLoginResponseDto,
  PlatformAuditLogListResponseDto,
  PlatformDeleteActivationCodeRequestDto,
  PlatformDeleteStudioRequestDto,
  PlatformGenerateActivationCodesRequestDto,
  PlatformGenerateActivationCodesResponseDto,
  PlatformStudioActionResponseDto,
  PlatformStudioDetailResponseDto,
  PlatformStudioListQueryDto,
  PlatformStudioListResponseDto,
} from "@st-manager/contracts";
import {
  loginSchema,
  platformActivationCodeListQuerySchema,
  platformDeleteActivationCodeSchema,
  platformDeleteStudioSchema,
  platformGenerateActivationCodesSchema,
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
  listActivationCodes(
    query?: PlatformActivationCodeListQueryDto,
  ): Promise<PlatformActivationCodeListResponseDto>;
  generateActivationCodes(
    input: PlatformGenerateActivationCodesRequestDto,
  ): Promise<PlatformGenerateActivationCodesResponseDto["data"]>;
  disableActivationCode(id: string): Promise<PlatformActivationCodeActionResponseDto["data"]>;
  enableActivationCode(id: string): Promise<PlatformActivationCodeActionResponseDto["data"]>;
  deleteActivationCode(id: string, input: PlatformDeleteActivationCodeRequestDto): Promise<void>;
  exportActivationCodes(): Promise<PlatformActivationCodesExportResponseDto["data"]>;
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

    listActivationCodes: async (query = {}) => {
      const validated = platformActivationCodeListQuerySchema.parse(query);
      return client.get<PlatformActivationCodeListResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/activation-codes`,
        validated as QueryParams,
      );
    },

    generateActivationCodes: async (input) => {
      const validated = platformGenerateActivationCodesSchema.parse(input);
      const response = await client.post<PlatformGenerateActivationCodesResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/activation-codes/generate`,
        validated,
      );
      return response.data;
    },

    disableActivationCode: async (id) => {
      const response = await client.post<PlatformActivationCodeActionResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/activation-codes/${encodeURIComponent(id)}/disable`,
        {},
      );
      return response.data;
    },

    enableActivationCode: async (id) => {
      const response = await client.post<PlatformActivationCodeActionResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/activation-codes/${encodeURIComponent(id)}/enable`,
        {},
      );
      return response.data;
    },

    deleteActivationCode: async (id, input) => {
      const validated = platformDeleteActivationCodeSchema.parse(input);
      await client.post(
        `${ROUTES.PLATFORM_ADMIN}/activation-codes/${encodeURIComponent(id)}/delete`,
        validated,
      );
    },

    exportActivationCodes: async () => {
      const response = await client.get<PlatformActivationCodesExportResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/activation-codes/export`,
      );
      return response.data;
    },
  };
}
