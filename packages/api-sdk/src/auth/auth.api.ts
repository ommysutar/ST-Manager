import { ROUTES } from "@st-manager/constants";
import type {
  LoginRequestDto,
  LoginResponseDataDto,
  LoginResponseDto,
  RefreshRequestDto,
  RefreshResponseDataDto,
  RefreshResponseDto,
} from "@st-manager/contracts";
import { loginSchema, refreshSchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface AuthApi {
  login(input: LoginRequestDto): Promise<LoginResponseDataDto>;
  refresh(input: RefreshRequestDto): Promise<RefreshResponseDataDto>;
}

export function createAuthApi(client: HttpClient): AuthApi {
  return {
    login: async (input) => {
      const validated = loginSchema.parse(input);
      const response = await client.post<LoginResponseDto>(`${ROUTES.AUTH}/login`, validated);
      return response.data;
    },

    refresh: async (input) => {
      const validated = refreshSchema.parse(input);
      const response = await client.post<RefreshResponseDto>(`${ROUTES.AUTH}/refresh`, validated);
      return response.data;
    },
  };
}
