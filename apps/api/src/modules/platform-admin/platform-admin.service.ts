import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import { PLATFORM_ROLES } from "@st-manager/constants";
import type {
  PlatformAdminDashboardDto,
  PlatformAdminLoginResponseDataDto,
} from "@st-manager/contracts";
import type { ApiEnv, LoginInput } from "@st-manager/validation";
import * as bcrypt from "bcrypt";

import type { JwtTokenPayload } from "../auth/auth.types";
import { expiresInToSeconds } from "../auth/auth.utils";
import { PlatformAdminRepository } from "./platform-admin.repository";

@Injectable()
export class PlatformAdminService implements OnModuleInit {
  private readonly logger = new Logger(PlatformAdminService.name);

  constructor(
    private readonly repository: PlatformAdminRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<ApiEnv, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bootstrapPlatformAdmin();
  }

  async bootstrapPlatformAdmin(): Promise<void> {
    const email = this.configService.get("PLATFORM_ADMIN_EMAIL", { infer: true });
    const password = this.configService.get("PLATFORM_ADMIN_PASSWORD", { infer: true });

    if (!email || !password) {
      this.logger.log(
        "Platform admin bootstrap skipped (PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD not set)",
      );
      return;
    }

    const existingCount = await this.repository.countPlatformAdmins();
    if (existingCount > 0) {
      this.logger.log("Platform admin already exists — bootstrap skipped");
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await this.repository.findByEmail(normalizedEmail);
    if (existingUser) {
      this.logger.warn(
        `Cannot bootstrap platform admin: email ${normalizedEmail} already belongs to another account`,
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.repository.createPlatformAdmin({
      email: normalizedEmail,
      passwordHash,
      fullName: "Platform Admin",
    });
    this.logger.log(`Platform admin bootstrapped for ${normalizedEmail}`);
  }

  async login(input: LoginInput): Promise<PlatformAdminLoginResponseDataDto> {
    const email = input.email.toLowerCase();
    const user = await this.repository.findByEmail(email);

    if (!user || user.role !== PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status === "disabled") {
      throw new UnauthorizedException("Your account has been disabled");
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.repository.updateLastLogin(user.id);
    const tokens = await this.issueTokenPair(user.id, user.email, user.role);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        studioId: user.studioId,
        status: user.status,
      },
    };
  }

  async getDashboard(): Promise<PlatformAdminDashboardDto> {
    const [totalStudios, totalUsers] = await Promise.all([
      this.repository.countStudios(),
      this.repository.countUsers(),
    ]);

    return {
      totalStudios,
      totalUsers,
      platformStatus: "operational",
      serverTime: new Date().toISOString(),
    };
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    role: string,
  ): Promise<Pick<PlatformAdminLoginResponseDataDto, "accessToken" | "refreshToken" | "expiresIn">> {
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
}
