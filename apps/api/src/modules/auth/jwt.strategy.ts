import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { ApiEnv } from "@st-manager/validation";
import { ExtractJwt, Strategy } from "passport-jwt";

import type { AuthenticatedUser, JwtTokenPayload } from "./auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<ApiEnv, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("AUTH_SECRET", { infer: true }),
    });
  }

  validate(payload: JwtTokenPayload): AuthenticatedUser {
    if (payload.type !== "access") {
      throw new UnauthorizedException();
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
