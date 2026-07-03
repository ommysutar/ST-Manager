import type { ApiSuccessResponseDto } from "../common/success-response.dto";
import type { AuthUserDto } from "./auth-user.dto";

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDataDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUserDto;
}

export type LoginResponseDto = ApiSuccessResponseDto<LoginResponseDataDto>;
