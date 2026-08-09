import type { ApiSuccessResponseDto } from "../common/success-response.dto";

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ForgotPasswordResponseDataDto {
  message: string;
}

export type ForgotPasswordResponseDto = ApiSuccessResponseDto<ForgotPasswordResponseDataDto>;

export interface ResetPasswordRequestDto {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordResponseDataDto {
  message: string;
}

export type ResetPasswordResponseDto = ApiSuccessResponseDto<ResetPasswordResponseDataDto>;
