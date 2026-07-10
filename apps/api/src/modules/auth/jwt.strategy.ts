import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import {
  DISABLED_STUDIO_MESSAGE,
  PLATFORM_ROLES,
  STUDIO_STATUSES,
} from "@st-manager/constants";
import type { ApiEnv } from "@st-manager/validation";
import { ExtractJwt, Strategy } from "passport-jwt";

import { AuthRepository } from "./auth.repository";
import type { AuthenticatedUser, JwtTokenPayload } from "./auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService<ApiEnv, true>,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("AUTH_SECRET", { infer: true }),
    });
  }

  async validate(payload: JwtTokenPayload): Promise<AuthenticatedUser> {
    if (payload.type !== "access") {
      throw new UnauthorizedException();
    }

    if (payload.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    }

    const user = await this.authRepository.findByIdWithStudio(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.status === "disabled") {
      throw new UnauthorizedException("Your account has been disabled");
    }

    if (
      user.studio &&
      (user.studio.status === STUDIO_STATUSES.DISABLED ||
        user.studio.status === STUDIO_STATUSES.ARCHIVED)
    ) {
      throw new UnauthorizedException(DISABLED_STUDIO_MESSAGE);
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
