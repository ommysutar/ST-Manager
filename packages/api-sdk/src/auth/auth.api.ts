import { ROUTES } from "@st-manager/constants";
import type {
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDataDto,
  ForgotPasswordResponseDto,
  LoginRequestDto,
  LoginResponseDataDto,
  LoginResponseDto,
  RefreshRequestDto,
  RefreshResponseDataDto,
  RefreshResponseDto,
  RegisterRequestDto,
  RegisterResponseDataDto,
  RegisterResponseDto,
  ResetPasswordRequestDto,
  ResetPasswordResponseDataDto,
  ResetPasswordResponseDto,
} from "@st-manager/contracts";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface AuthApi {
  login(input: LoginRequestDto): Promise<LoginResponseDataDto>;
  register(input: RegisterRequestDto): Promise<RegisterResponseDataDto>;
  refresh(input: RefreshRequestDto): Promise<RefreshResponseDataDto>;
  forgotPassword(input: ForgotPasswordRequestDto): Promise<ForgotPasswordResponseDataDto>;
  resetPassword(input: ResetPasswordRequestDto): Promise<ResetPasswordResponseDataDto>;
}

export function createAuthApi(client: HttpClient): AuthApi {
  return {
    login: async (input) => {
      const validated = loginSchema.parse(input);
      const response = await client.post<LoginResponseDto>(`${ROUTES.AUTH}/login`, validated);
      return response.data;
    },

    register: async (input) => {
      const validated = registerSchema.parse(input);
      const response = await client.post<RegisterResponseDto>(`${ROUTES.AUTH}/register`, validated);
      return response.data;
    },

    refresh: async (input) => {
      const validated = refreshSchema.parse(input);
      const response = await client.post<RefreshResponseDto>(`${ROUTES.AUTH}/refresh`, validated);
      return response.data;
    },

    forgotPassword: async (input) => {
      const validated = forgotPasswordSchema.parse(input);
      const response = await client.post<ForgotPasswordResponseDto>(
        `${ROUTES.AUTH}/forgot-password`,
        validated,
      );
      return response.data;
    },

    resetPassword: async (input) => {
      const validated = resetPasswordSchema.parse(input);
      const response = await client.post<ResetPasswordResponseDto>(
        `${ROUTES.AUTH}/reset-password`,
        validated,
      );
      return response.data;
    },
  };
}
