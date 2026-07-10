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
  totalUsers: number;
  verifiedUsers: number;
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
