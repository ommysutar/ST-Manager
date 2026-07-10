import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import {
  DISABLED_STUDIO_MESSAGE,
  PLATFORM_AUDIT_ACTIONS,
  PLATFORM_ROLES,
  STUDIO_STATUSES,
  TEAM_ROLES,
} from "@st-manager/constants";
import type {
  PlatformAdminDashboardDto,
  PlatformAdminLoginResponseDataDto,
  PlatformStudioDetailDto,
  PlatformStudioListItemDto,
} from "@st-manager/contracts";
import type {
  ApiEnv,
  LoginInput,
  PlatformDeleteStudioInput,
  PlatformStudioListQueryInput,
} from "@st-manager/validation";
import * as bcrypt from "bcrypt";

import type { AuthenticatedUser, JwtTokenPayload } from "../auth/auth.types";
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
    await this.repository.createPlatformAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: PLATFORM_AUDIT_ACTIONS.PLATFORM_ADMIN_LOGIN,
    });

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
    const counts = await this.repository.getDashboardCounts();
    return {
      ...counts,
      platformStatus: "operational",
      serverTime: new Date().toISOString(),
    };
  }

  async listStudios(query: PlatformStudioListQueryInput) {
    const { total, rows } = await this.repository.listStudios(query);
    return {
      data: rows,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
    };
  }

  async getStudio(studioId: string): Promise<PlatformStudioDetailDto> {
    const detail = await this.repository.findStudioDetail(studioId);
    if (!detail) {
      throw new NotFoundException("Studio not found");
    }
    return detail;
  }

  async disableStudio(
    studioId: string,
    actor: AuthenticatedUser,
  ): Promise<PlatformStudioListItemDto> {
    const studio = await this.requireStudio(studioId);
    if (studio.status === STUDIO_STATUSES.ARCHIVED) {
      throw new BadRequestException("Archived studios cannot be disabled");
    }
    if (studio.status === STUDIO_STATUSES.DISABLED) {
      return this.toListItem(await this.repository.updateStudioStatus(studioId, STUDIO_STATUSES.DISABLED, null));
    }

    const updated = await this.repository.updateStudioStatus(
      studioId,
      STUDIO_STATUSES.DISABLED,
      null,
    );
    await this.repository.createPlatformAuditLog({
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: PLATFORM_AUDIT_ACTIONS.STUDIO_DISABLED,
      studioId: studio.id,
      studioName: studio.name,
    });
    return this.toListItem(updated);
  }

  async enableStudio(
    studioId: string,
    actor: AuthenticatedUser,
  ): Promise<PlatformStudioListItemDto> {
    const studio = await this.requireStudio(studioId);
    if (studio.status === STUDIO_STATUSES.ARCHIVED) {
      throw new BadRequestException("Archived studios cannot be enabled");
    }

    const updated = await this.repository.updateStudioStatus(
      studioId,
      STUDIO_STATUSES.ACTIVE,
      null,
    );
    await this.repository.createPlatformAuditLog({
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: PLATFORM_AUDIT_ACTIONS.STUDIO_ENABLED,
      studioId: studio.id,
      studioName: studio.name,
    });
    return this.toListItem(updated);
  }

  async deleteStudio(
    studioId: string,
    input: PlatformDeleteStudioInput,
    actor: AuthenticatedUser,
  ): Promise<PlatformStudioListItemDto> {
    if (input.confirmation !== "DELETE") {
      throw new BadRequestException('Type DELETE to confirm studio deletion');
    }

    const studio = await this.requireStudio(studioId);
    if (studio.status === STUDIO_STATUSES.ARCHIVED) {
      throw new BadRequestException("Studio is already archived");
    }

    const updated = await this.repository.updateStudioStatus(
      studioId,
      STUDIO_STATUSES.ARCHIVED,
      new Date(),
    );
    await this.repository.createPlatformAuditLog({
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: PLATFORM_AUDIT_ACTIONS.STUDIO_DELETED,
      studioId: studio.id,
      studioName: studio.name,
    });
    return this.toListItem(updated);
  }

  async listAuditLogs() {
    const logs = await this.repository.listRecentAuditLogs();
    return logs.map((log) => ({
      id: log.id,
      actorEmail: log.actorEmail,
      action: log.action,
      studioId: log.studioId,
      studioName: log.studioName,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  private async requireStudio(studioId: string) {
    const studio = await this.repository.findStudioById(studioId);
    if (!studio) {
      throw new NotFoundException("Studio not found");
    }
    return studio;
  }

  private toListItem(studio: {
    id: string;
    name: string;
    status: string;
    createdAt: Date;
    members: Array<{ fullName: string | null; email: string; role: string }>;
    _count: { members: number };
  }): PlatformStudioListItemDto {
    const owner = studio.members.find((m) => m.role === TEAM_ROLES.OWNER) ?? null;
    return {
      id: studio.id,
      name: studio.name,
      ownerName: owner?.fullName ?? null,
      ownerEmail: owner?.email ?? null,
      createdAt: studio.createdAt.toISOString(),
      totalUsers: studio._count.members,
      status: studio.status,
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

export { DISABLED_STUDIO_MESSAGE };
