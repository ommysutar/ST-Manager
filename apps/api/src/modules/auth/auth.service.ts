import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import type {
  AuthUserDto,
  LoginResponseDataDto,
  RefreshResponseDataDto,
} from "@st-manager/contracts";
import type { ApiEnv, LoginInput, RefreshInput } from "@st-manager/validation";
import * as bcrypt from "bcrypt";

import { AuthRepository } from "./auth.repository";
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
    const user = await this.authRepository.findByEmail(input.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password");
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

  private toAuthUserDto(user: { id: string; email: string; role: string }): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
