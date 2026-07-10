import type { ApiSuccessResponseDto } from "../common/success-response.dto";
import type { AuthUserDto } from "../auth/auth-user.dto";

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
  totalUsers: number;
  platformStatus: string;
  serverTime: string;
}

export type PlatformAdminDashboardResponseDto = ApiSuccessResponseDto<PlatformAdminDashboardDto>;
