import type { ApiSuccessResponseDto } from "../common/success-response.dto";
import type { AuthUserDto } from "../auth/auth-user.dto";
import type { PaginatedResponseDto } from "../common/pagination.dto";

export interface PlatformAdminLoginRequestDto {
  email: string;
  password: string;
}

export interface PlatformAdminLoginResponseDataDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUserDto;
}

export type PlatformAdminLoginResponseDto = ApiSuccessResponseDto<PlatformAdminLoginResponseDataDto>;

export interface PlatformAdminDashboardDto {
  totalStudios: number;
  activeStudios: number;
  disabledStudios: number;
  archivedStudios: number;
  totalUsers: number;
  verifiedUsers: number;
  activationCodes: number;
  usedActivationCodes: number;
  pendingActivationCodes: number;
  platformStatus: string;
  serverTime: string;
}

export type PlatformAdminDashboardResponseDto = ApiSuccessResponseDto<PlatformAdminDashboardDto>;

export interface PlatformStudioListItemDto {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
  totalUsers: number;
  status: string;
}

export interface PlatformStudioListQueryDto {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "createdAt" | "status" | "totalUsers";
  sortOrder?: "asc" | "desc";
  status?: string;
}

export type PlatformStudioListResponseDto = PaginatedResponseDto<PlatformStudioListItemDto>;

export interface PlatformStudioMemberDto {
  id: string;
  fullName: string | null;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
}

export interface PlatformStudioDetailDto {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  archivedAt: string | null;
  owner: {
    id: string;
    fullName: string | null;
    email: string;
    lastLoginAt: string | null;
  } | null;
  members: PlatformStudioMemberDto[];
  totalUsers: number;
  totalProjects: number;
  totalBookings: number;
  totalClients: number;
  storageUsed: string;
  lastLoginAt: string | null;
}

export type PlatformStudioDetailResponseDto = ApiSuccessResponseDto<PlatformStudioDetailDto>;

export type PlatformStudioActionResponseDto = ApiSuccessResponseDto<PlatformStudioListItemDto>;

export interface PlatformDeleteStudioRequestDto {
  confirmation: string;
}

export interface PlatformAuditLogDto {
  id: string;
  actorEmail: string;
  action: string;
  studioId: string | null;
  studioName: string | null;
  createdAt: string;
}

export type PlatformAuditLogListResponseDto = ApiSuccessResponseDto<PlatformAuditLogDto[]>;

export interface PlatformActivationCodeDto {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedByStudioId: string | null;
  usedByStudioName: string | null;
  usedByOwnerEmail: string | null;
  generatedByPlatformAdmin: string;
  notes: string | null;
}

export interface PlatformActivationCodeSummaryDto {
  totalCodes: number;
  activeCodes: number;
  usedCodes: number;
  disabledCodes: number;
  expiredCodes: number;
}

export interface PlatformActivationCodeListQueryDto {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "code" | "status" | "createdAt" | "expiresAt";
  sortOrder?: "asc" | "desc";
  status?: string;
}

export type PlatformActivationCodeListResponseDto = PaginatedResponseDto<PlatformActivationCodeDto> & {
  summary: PlatformActivationCodeSummaryDto;
};

export interface PlatformGenerateActivationCodesRequestDto {
  quantity: 1 | 5 | 10 | 25 | 50;
  expiresAt?: string | null;
  notes?: string | null;
}

export type PlatformGenerateActivationCodesResponseDto = ApiSuccessResponseDto<{
  codes: PlatformActivationCodeDto[];
}>;

export type PlatformActivationCodeActionResponseDto = ApiSuccessResponseDto<PlatformActivationCodeDto>;

export interface PlatformDeleteActivationCodeRequestDto {
  confirmation: string;
}

export type PlatformActivationCodesExportResponseDto = ApiSuccessResponseDto<{
  csv: string;
  filename: string;
}>;

export interface PlatformLicenseDto {
  id: string;
  code: string;
  status: string;
  licenseType: string;
  subscriptionMonths: number | null;
  customerName: string | null;
  phone: string | null;
  createdAt: string;
  expiresAt: string | null;
  activatedAt: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  usedByStudioId: string | null;
  usedByStudioName: string | null;
  usedByOwnerEmail: string | null;
  generatedByPlatformAdmin: string;
  notes: string | null;
}

export interface PlatformLicenseSummaryDto {
  total: number;
  active: number;
  used: number;
  expired: number;
  revoked: number;
  disabled: number;
  lifetime: number;
  trial: number;
  revenuePlaceholder: string;
}

export interface PlatformLicenseListQueryDto {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "code" | "status" | "createdAt" | "expiresAt" | "licenseType";
  sortOrder?: "asc" | "desc";
  status?: string;
  licenseType?: string;
  createdFrom?: string;
  createdTo?: string;
}

export type PlatformLicenseListResponseDto = PaginatedResponseDto<PlatformLicenseDto> & {
  summary: PlatformLicenseSummaryDto;
};

export interface PlatformGenerateLicensesRequestDto {
  quantity: 1 | 5 | 10 | 25 | 50 | 100;
  licenseType: "LIFETIME" | "TRIAL" | "SUBSCRIPTION";
  subscriptionMonths?: 1 | 3 | 6 | 12 | null;
  customerName?: string | null;
  phone?: string | null;
  notes?: string | null;
  expiresAt?: string | null;
}

export type PlatformGenerateLicensesResponseDto = ApiSuccessResponseDto<{
  licenses: PlatformLicenseDto[];
}>;

export type PlatformLicenseActionResponseDto = ApiSuccessResponseDto<PlatformLicenseDto>;

export interface PlatformDeleteLicenseRequestDto {
  confirmation: string;
}

export type PlatformLicensesExportResponseDto = ApiSuccessResponseDto<{
  csv: string;
  filename: string;
}>;

export interface StudioLicenseDto {
  id: string;
  code: string;
  status: string;
  licenseType: string;
  subscriptionMonths: number | null;
  customerName: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  activatedBy: string | null;
  verified: boolean;
}

export type StudioLicenseResponseDto = ApiSuccessResponseDto<StudioLicenseDto>;
