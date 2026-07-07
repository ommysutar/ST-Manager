import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type { LoginResponseDto, RefreshResponseDto } from "@st-manager/contracts";
import { loginSchema, refreshSchema, registerSchema, type LoginInput, type RefreshInput, type RegisterInput } from "@st-manager/validation";

import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";

@Controller(ROUTES.AUTH)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginInput,
  ): Promise<LoginResponseDto> {
    const data = await this.authService.login(dto);
    return { success: true, data };
  }

  @Post("register")
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterInput,
  ): Promise<LoginResponseDto> {
    const data = await this.authService.register(dto);
    return { success: true, data };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) dto: RefreshInput,
  ): Promise<RefreshResponseDto> {
    const data = await this.authService.refresh(dto);
    return { success: true, data };
  }
}
