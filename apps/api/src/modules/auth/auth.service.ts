import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import {
  DISABLED_STUDIO_MESSAGE,
  PASSWORD_RESET,
  PLATFORM_ROLES,
  STUDIO_STATUSES,
} from "@st-manager/constants";
import type {
  AuthUserDto,
  ForgotPasswordResponseDataDto,
  LoginResponseDataDto,
  RefreshResponseDataDto,
  ResetPasswordResponseDataDto,
} from "@st-manager/contracts";
import type {
  ApiEnv,
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
  ResetPasswordInput,
} from "@st-manager/validation";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";

import { EmailService } from "../email/email.service";
import { ActivationCodeRedeemError, AuthRepository } from "./auth.repository";
import type { JwtTokenPayload } from "./auth.types";
import { expiresInToSeconds } from "./auth.utils";

const FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<ApiEnv, true>,
    private readonly emailService: EmailService,
  ) {}

  async login(input: LoginInput): Promise<LoginResponseDataDto> {
    const user = await this.authRepository.findByEmailWithStudio(input.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status === "disabled") {
      throw new UnauthorizedException("Your account has been disabled");
    }

    if (user.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (
      user.studio &&
      (user.studio.status === STUDIO_STATUSES.DISABLED ||
        user.studio.status === STUDIO_STATUSES.ARCHIVED)
    ) {
      throw new UnauthorizedException(DISABLED_STUDIO_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.authRepository.updateLastLogin(user.id);
    const tokens = await this.issueTokenPair(user.id, user.email, user.role);
    return {
      ...tokens,
      user: this.toAuthUserDto(user),
    };
  }

  async loginWithUser(userId: string): Promise<LoginResponseDataDto> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    await this.authRepository.updateLastLogin(user.id);
    const tokens = await this.issueTokenPair(user.id, user.email, user.role);
    return {
      ...tokens,
      user: this.toAuthUserDto(user),
    };
  }

  async register(input: RegisterInput): Promise<LoginResponseDataDto> {
    const email = input.email.toLowerCase();
    const existing = await this.authRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    let user;
    try {
      user = await this.authRepository.createStudioWithOwner({
        studioName: input.studioName,
        ownerName: input.ownerName,
        email,
        passwordHash,
        activationCode: input.activationCode,
      });
    } catch (error) {
      if (error instanceof ActivationCodeRedeemError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
    const tokens = await this.issueTokenPair(user.id, user.email, user.role);

    return {
      ...tokens,
      user: this.toAuthUserDto(user),
    };
  }

  async refresh(input: RefreshInput): Promise<RefreshResponseDataDto> {
    const secret = this.configService.get("AUTH_SECRET", { infer: true });
    let payload: JwtTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtTokenPayload>(input.refreshToken, { secret });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.authRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (user.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return this.issueTokenPair(user.id, user.email, user.role);
  }

  async forgotPassword(
    input: ForgotPasswordInput,
    requestIp: string | null,
  ): Promise<ForgotPasswordResponseDataDto> {
    const email = input.email.trim().toLowerCase();
    await this.assertForgotPasswordRateLimit(email, requestIp);

    const user = await this.authRepository.findByEmail(email);
    if (!user || user.status === "disabled" || user.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      return { message: FORGOT_PASSWORD_MESSAGE };
    }

    await this.authRepository.invalidateActiveResetTokens(user.id);

    const { token, tokenHash } = this.generateResetToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET.TOKEN_TTL_MS);
    await this.authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
      requestIp,
    });

    const resetUrl = this.emailService.buildPasswordResetUrl(token);
    await this.emailService.sendPasswordReset({
      to: user.email,
      fullName: user.fullName,
      resetUrl,
      expiresAt,
    });

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResponseDataDto> {
    const tokenHash = this.hashToken(input.token.trim());
    const record = await this.authRepository.findPasswordResetTokenByHash(tokenHash);

    if (!record || record.usedAt) {
      throw new BadRequestException("This password reset link is invalid or has already been used.");
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("This password reset link has expired. Please request a new one.");
    }

    const user = await this.authRepository.findById(record.userId);
    if (!user || user.status === "disabled" || user.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new BadRequestException("This password reset link is invalid or has already been used.");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    try {
      await this.authRepository.consumePasswordResetToken({
        tokenId: record.id,
        userId: user.id,
        passwordHash,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "PASSWORD_RESET_TOKEN_ALREADY_USED") {
        throw new BadRequestException(
          "This password reset link is invalid or has already been used.",
        );
      }
      throw error;
    }

    return { message: "Password updated successfully. You can now sign in with your new password." };
  }

  private async assertForgotPasswordRateLimit(
    email: string,
    requestIp: string | null,
  ): Promise<void> {
    const since = new Date(Date.now() - PASSWORD_RESET.RATE_LIMIT_WINDOW_MS);
    const emailKey = `email:${this.hashToken(email)}`;
    const ipKey = requestIp ? `ip:${this.hashToken(requestIp)}` : null;

    const emailHits = await this.authRepository.countRateLimitHits(emailKey, since);
    if (emailHits >= PASSWORD_RESET.MAX_REQUESTS_PER_EMAIL) {
      throw new HttpException(
        "Too many password reset requests. Please try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (ipKey) {
      const ipHits = await this.authRepository.countRateLimitHits(ipKey, since);
      if (ipHits >= PASSWORD_RESET.MAX_REQUESTS_PER_IP) {
        throw new HttpException(
          "Too many password reset requests. Please try again later.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    await this.authRepository.recordRateLimitHit(emailKey);
    if (ipKey) {
      await this.authRepository.recordRateLimitHit(ipKey);
    }
  }

  private generateResetToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString("hex");
    return { token, tokenHash: this.hashToken(token) };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    role: string,
  ): Promise<Pick<LoginResponseDataDto, "accessToken" | "refreshToken" | "expiresIn">> {
    const accessExpiresIn = this.configService.get("JWT_ACCESS_EXPIRES_IN", { infer: true });
    const refreshExpiresIn = this.configService.get("JWT_REFRESH_EXPIRES_IN", { infer: true });

    const accessSignOptions: JwtSignOptions = {
      expiresIn: accessExpiresIn as JwtSignOptions["expiresIn"],
    };
    const refreshSignOptions: JwtSignOptions = {
      expiresIn: refreshExpiresIn as JwtSignOptions["expiresIn"],
    };

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role, type: "access" } satisfies JwtTokenPayload,
      accessSignOptions,
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email, role, type: "refresh" } satisfies JwtTokenPayload,
      refreshSignOptions,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInToSeconds(accessExpiresIn),
    };
  }

  private toAuthUserDto(user: {
    id: string;
    email: string;
    role: string;
    fullName?: string | null;
    studioId?: string | null;
    status?: string;
  }): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName ?? null,
      studioId: user.studioId ?? null,
      status: user.status ?? "active",
    };
  }
}
