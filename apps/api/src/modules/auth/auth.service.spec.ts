import { BadRequestException, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PASSWORD_RESET, PLATFORM_ROLES } from "@st-manager/constants";
import type { ApiEnv } from "@st-manager/validation";
import * as bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmailService } from "../email/email.service";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";

describe("AuthService password reset", () => {
  const authRepository = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByEmailWithStudio: vi.fn(),
    updateLastLogin: vi.fn(),
    countRateLimitHits: vi.fn(),
    recordRateLimitHit: vi.fn(),
    invalidateActiveResetTokens: vi.fn(),
    createPasswordResetToken: vi.fn(),
    findPasswordResetTokenByHash: vi.fn(),
    consumePasswordResetToken: vi.fn(),
  };

  const emailService = {
    buildPasswordResetUrl: vi.fn(
      (token: string) => `https://stmanager.app/login/reset-password?token=${token}`,
    ),
    sendPasswordReset: vi.fn(),
  };

  const jwtService = {
    signAsync: vi.fn(),
    verifyAsync: vi.fn(),
  };

  const configService = {
    get: vi.fn((key: string) => {
      if (key === "JWT_ACCESS_EXPIRES_IN") return "15m";
      if (key === "JWT_REFRESH_EXPIRES_IN") return "7d";
      if (key === "AUTH_SECRET") return "dev-only-auth-secret-minimum-32-characters-long";
      return undefined;
    }),
  };

  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authRepository.countRateLimitHits.mockResolvedValue(0);
    authRepository.recordRateLimitHit.mockResolvedValue(undefined);
    authRepository.invalidateActiveResetTokens.mockResolvedValue(undefined);
    authRepository.createPasswordResetToken.mockResolvedValue(undefined);
    authRepository.updateLastLogin.mockResolvedValue(undefined);
    emailService.sendPasswordReset.mockResolvedValue(undefined);
    service = new AuthService(
      authRepository as unknown as AuthRepository,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService<ApiEnv, true>,
      emailService as unknown as EmailService,
    );
  });

  it("sends reset email for a valid studio user", async () => {
    authRepository.findByEmail.mockResolvedValue({
      id: "u1",
      email: "owner@studio.com",
      fullName: "Owner",
      role: "owner",
      status: "active",
      passwordHash: "hash",
      studioId: "s1",
      phone: null,
      lastLoginAt: null,
    });

    const result = await service.forgotPassword({ email: "owner@studio.com" }, "127.0.0.1");

    expect(result.message).toMatch(/If an account exists/i);
    expect(authRepository.invalidateActiveResetTokens).toHaveBeenCalledWith("u1");
    expect(authRepository.createPasswordResetToken).toHaveBeenCalledOnce();
    expect(emailService.sendPasswordReset).toHaveBeenCalledOnce();
    const sendArg = emailService.sendPasswordReset.mock.calls[0]?.[0];
    expect(sendArg.to).toBe("owner@studio.com");
    expect(sendArg.resetUrl).toContain("token=");
  });

  it("does not reveal unknown emails and skips sending", async () => {
    authRepository.findByEmail.mockResolvedValue(null);

    const result = await service.forgotPassword({ email: "missing@studio.com" }, "127.0.0.1");

    expect(result.message).toMatch(/If an account exists/i);
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
    expect(authRepository.createPasswordResetToken).not.toHaveBeenCalled();
  });

  it("rate-limits repeated forgot-password requests", async () => {
    authRepository.countRateLimitHits.mockResolvedValue(PASSWORD_RESET.MAX_REQUESTS_PER_EMAIL);

    try {
      await service.forgotPassword({ email: "owner@studio.com" }, "127.0.0.1");
      throw new Error("expected rate limit error");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it("rejects expired reset tokens", async () => {
    authRepository.findPasswordResetTokenByHash.mockResolvedValue({
      id: "t1",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });

    await expect(
      service.resetPassword({
        token: "a".repeat(64),
        password: "newpassword1",
        confirmPassword: "newpassword1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects reused reset tokens", async () => {
    authRepository.findPasswordResetTokenByHash.mockResolvedValue({
      id: "t1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    });

    await expect(
      service.resetPassword({
        token: "b".repeat(64),
        password: "newpassword1",
        confirmPassword: "newpassword1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("resets password and consumes the token", async () => {
    authRepository.findPasswordResetTokenByHash.mockResolvedValue({
      id: "t1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    authRepository.findById.mockResolvedValue({
      id: "u1",
      email: "owner@studio.com",
      role: "owner",
      status: "active",
      passwordHash: "old",
      fullName: "Owner",
      studioId: "s1",
      phone: null,
      lastLoginAt: null,
    });
    authRepository.consumePasswordResetToken.mockResolvedValue(undefined);

    const result = await service.resetPassword({
      token: "c".repeat(64),
      password: "newpassword1",
      confirmPassword: "newpassword1",
    });

    expect(result.message).toMatch(/Password updated successfully/i);
    expect(authRepository.consumePasswordResetToken).toHaveBeenCalledOnce();
    const consumeArg = authRepository.consumePasswordResetToken.mock.calls[0]?.[0];
    expect(consumeArg.tokenId).toBe("t1");
    expect(consumeArg.userId).toBe("u1");
    expect(await bcrypt.compare("newpassword1", consumeArg.passwordHash)).toBe(true);
    expect(await bcrypt.compare("oldpassword1", consumeArg.passwordHash)).toBe(false);
  });

  it("allows login with the new password hash after reset", async () => {
    const newHash = await bcrypt.hash("newpassword1", 10);
    authRepository.findByEmailWithStudio.mockResolvedValue({
      id: "u1",
      email: "owner@studio.com",
      role: "owner",
      status: "active",
      passwordHash: newHash,
      fullName: "Owner",
      studioId: "s1",
      phone: null,
      lastLoginAt: null,
      studio: { id: "s1", status: "active", name: "Studio" },
    });
    jwtService.signAsync.mockResolvedValue("token");

    await expect(
      service.login({ email: "owner@studio.com", password: "oldpassword1" }),
    ).rejects.toThrow(/Invalid email or password/);

    const session = await service.login({ email: "owner@studio.com", password: "newpassword1" });
    expect(session.accessToken).toBe("token");
  });

  it("does not send reset mail for platform admin accounts", async () => {
    authRepository.findByEmail.mockResolvedValue({
      id: "admin1",
      email: "platform-admin@stmanager.app",
      role: PLATFORM_ROLES.PLATFORM_ADMIN,
      status: "active",
      passwordHash: "hash",
      fullName: "Admin",
      studioId: null,
      phone: null,
      lastLoginAt: null,
    });

    const result = await service.forgotPassword(
      { email: "platform-admin@stmanager.app" },
      "127.0.0.1",
    );

    expect(result.message).toMatch(/If an account exists/i);
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
  });
});
