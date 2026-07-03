import type { ApiSuccessResponseDto } from "../common/success-response.dto";

export interface RefreshRequestDto {
  refreshToken: string;
}

export interface RefreshResponseDataDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type RefreshResponseDto = ApiSuccessResponseDto<RefreshResponseDataDto>;
