import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import { DISABLED_STUDIO_MESSAGE, PLATFORM_ROLES, STUDIO_STATUSES } from "@st-manager/constants";
import type {
  AuthUserDto,
  LoginResponseDataDto,
  RefreshResponseDataDto,
} from "@st-manager/contracts";
import type { ApiEnv, LoginInput, RefreshInput, RegisterInput } from "@st-manager/validation";
import * as bcrypt from "bcrypt";

import { ActivationCodeRedeemError, AuthRepository } from "./auth.repository";
import type { JwtTokenPayload } from "./auth.types";
import { expiresInToSeconds } from "./auth.utils";

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<ApiEnv, true>,
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

    return this.issueTokenPair(user.id, user.email, user.role);
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
