import { Body, Controller, Headers, HttpCode, Post, Req } from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type {
  ForgotPasswordResponseDto,
  LoginResponseDto,
  RefreshResponseDto,
  ResetPasswordResponseDto,
} from "@st-manager/contracts";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "@st-manager/validation";

import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";

interface MinimalRequest {
  ip?: string;
  socket?: { remoteAddress?: string };
}

function resolveClientIp(
  req: MinimalRequest,
  forwardedFor?: string,
): string | null {
  const forwarded = forwardedFor?.split(",")[0]?.trim();
  if (forwarded) {
    return forwarded.slice(0, 64);
  }
  const direct = req.ip ?? req.socket?.remoteAddress ?? null;
  return direct ? direct.slice(0, 64) : null;
}

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

  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordInput,
    @Req() req: MinimalRequest,
    @Headers("x-forwarded-for") forwardedFor?: string,
  ): Promise<ForgotPasswordResponseDto> {
    const data = await this.authService.forgotPassword(dto, resolveClientIp(req, forwardedFor));
    return { success: true, data };
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordInput,
  ): Promise<ResetPasswordResponseDto> {
    const data = await this.authService.resetPassword(dto);
    return { success: true, data };
  }
}
