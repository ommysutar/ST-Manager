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
  PlatformDeleteLicenseRequestDto,
  PlatformDeleteStudioRequestDto,
  PlatformGenerateActivationCodesRequestDto,
  PlatformGenerateActivationCodesResponseDto,
  PlatformGenerateLicensesRequestDto,
  PlatformGenerateLicensesResponseDto,
  PlatformLicenseActionResponseDto,
  PlatformLicenseListQueryDto,
  PlatformLicenseListResponseDto,
  PlatformLicensesExportResponseDto,
  PlatformStudioActionResponseDto,
  PlatformStudioDetailResponseDto,
  PlatformStudioListQueryDto,
  PlatformStudioListResponseDto,
} from "@st-manager/contracts";
import {
  loginSchema,
  platformActivationCodeListQuerySchema,
  platformDeleteActivationCodeSchema,
  platformDeleteLicenseSchema,
  platformDeleteStudioSchema,
  platformGenerateActivationCodesSchema,
  platformGenerateLicensesSchema,
  platformLicenseListQuerySchema,
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
  listLicenses(query?: PlatformLicenseListQueryDto): Promise<PlatformLicenseListResponseDto>;
  generateLicenses(
    input: PlatformGenerateLicensesRequestDto,
  ): Promise<PlatformGenerateLicensesResponseDto["data"]>;
  disableLicense(id: string): Promise<PlatformLicenseActionResponseDto["data"]>;
  enableLicense(id: string): Promise<PlatformLicenseActionResponseDto["data"]>;
  revokeLicense(id: string): Promise<PlatformLicenseActionResponseDto["data"]>;
  duplicateLicense(id: string): Promise<PlatformLicenseActionResponseDto["data"]>;
  deleteLicense(id: string, input: PlatformDeleteLicenseRequestDto): Promise<void>;
  exportLicenses(): Promise<PlatformLicensesExportResponseDto["data"]>;
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

    listLicenses: async (query = {}) => {
      const validated = platformLicenseListQuerySchema.parse(query);
      return client.get<PlatformLicenseListResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/licenses`,
        validated as QueryParams,
      );
    },

    generateLicenses: async (input) => {
      const validated = platformGenerateLicensesSchema.parse(input);
      const response = await client.post<PlatformGenerateLicensesResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/licenses/generate`,
        validated,
      );
      return response.data;
    },

    disableLicense: async (id) => {
      const response = await client.post<PlatformLicenseActionResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/licenses/${encodeURIComponent(id)}/disable`,
        {},
      );
      return response.data;
    },

    enableLicense: async (id) => {
      const response = await client.post<PlatformLicenseActionResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/licenses/${encodeURIComponent(id)}/enable`,
        {},
      );
      return response.data;
    },

    revokeLicense: async (id) => {
      const response = await client.post<PlatformLicenseActionResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/licenses/${encodeURIComponent(id)}/revoke`,
        {},
      );
      return response.data;
    },

    duplicateLicense: async (id) => {
      const response = await client.post<PlatformLicenseActionResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/licenses/${encodeURIComponent(id)}/duplicate`,
        {},
      );
      return response.data;
    },

    deleteLicense: async (id, input) => {
      const validated = platformDeleteLicenseSchema.parse(input);
      await client.post(
        `${ROUTES.PLATFORM_ADMIN}/licenses/${encodeURIComponent(id)}/delete`,
        validated,
      );
    },

    exportLicenses: async () => {
      const response = await client.get<PlatformLicensesExportResponseDto>(
        `${ROUTES.PLATFORM_ADMIN}/licenses/export`,
      );
      return response.data;
    },
  };
}
