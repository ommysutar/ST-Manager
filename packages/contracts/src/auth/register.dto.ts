import type { ApiSuccessResponseDto } from "../common/success-response.dto";
import type { LoginResponseDataDto } from "./login.dto";

export interface RegisterRequestDto {
  studioName: string;
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
  activationCode: string;
}

export type RegisterResponseDataDto = LoginResponseDataDto;

export type RegisterResponseDto = ApiSuccessResponseDto<RegisterResponseDataDto>;
