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
  ACTIVATION_CODE_STATUSES,
  DISABLED_STUDIO_MESSAGE,
  PLATFORM_AUDIT_ACTIONS,
  PLATFORM_ROLES,
  STUDIO_STATUSES,
  TEAM_ROLES,
} from "@st-manager/constants";
import type {
  PlatformActivationCodeDto,
  PlatformAdminDashboardDto,
  PlatformAdminLoginResponseDataDto,
  PlatformStudioDetailDto,
  PlatformStudioListItemDto,
} from "@st-manager/contracts";
import type {
  ApiEnv,
  LoginInput,
  PlatformActivationCodeListQueryInput,
  PlatformDeleteActivationCodeInput,
  PlatformDeleteStudioInput,
  PlatformGenerateActivationCodesInput,
  PlatformStudioListQueryInput,
} from "@st-manager/validation";
import * as bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";

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

  async listActivationCodes(query: PlatformActivationCodeListQueryInput) {
    await this.repository.markExpiredActivationCodes();
    const [summary, { total, rows }] = await Promise.all([
      this.repository.getActivationCodeSummary(),
      this.repository.listActivationCodes(query),
    ]);

    return {
      data: rows.map((row) => this.toActivationCodeDto(row)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
      summary,
    };
  }

  async generateActivationCodes(
    input: PlatformGenerateActivationCodesInput,
    actor: AuthenticatedUser,
  ): Promise<PlatformActivationCodeDto[]> {
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException("Invalid expiry date");
    }
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("Expiry date must be in the future");
    }

    const codes: Array<{
      code: string;
      expiresAt: Date | null;
      notes: string | null;
      generatedByPlatformAdmin: string;
    }> = [];

    for (let i = 0; i < input.quantity; i += 1) {
      codes.push({
        code: await this.generateUniqueCode(),
        expiresAt,
        notes: input.notes?.trim() || null,
        generatedByPlatformAdmin: actor.userId,
      });
    }

    const created = await this.repository.createActivationCodes(codes);
    await this.repository.createPlatformAuditLog({
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: PLATFORM_AUDIT_ACTIONS.ACTIVATION_CODE_GENERATED,
      metadata: {
        quantity: input.quantity,
        codes: created.map((c) => c.code).join(","),
      },
    });

    return created.map((row) => this.toActivationCodeDto(row));
  }

  async disableActivationCode(id: string, actor: AuthenticatedUser): Promise<PlatformActivationCodeDto> {
    const code = await this.requireMutableActivationCode(id);
    const updated = await this.repository.updateActivationCodeStatus(
      code.id,
      ACTIVATION_CODE_STATUSES.DISABLED,
    );
    await this.repository.createPlatformAuditLog({
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: PLATFORM_AUDIT_ACTIONS.ACTIVATION_CODE_DISABLED,
      metadata: { code: code.code },
    });
    return this.toActivationCodeDto(updated);
  }

  async enableActivationCode(id: string, actor: AuthenticatedUser): Promise<PlatformActivationCodeDto> {
    const code = await this.requireActivationCode(id);
    if (code.status !== ACTIVATION_CODE_STATUSES.DISABLED) {
      throw new BadRequestException("Only disabled activation codes can be enabled");
    }
    if (code.expiresAt && code.expiresAt.getTime() <= Date.now()) {
      const expired = await this.repository.updateActivationCodeStatus(
        code.id,
        ACTIVATION_CODE_STATUSES.EXPIRED,
      );
      return this.toActivationCodeDto(expired);
    }

    const updated = await this.repository.updateActivationCodeStatus(
      code.id,
      ACTIVATION_CODE_STATUSES.ACTIVE,
    );
    await this.repository.createPlatformAuditLog({
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: PLATFORM_AUDIT_ACTIONS.ACTIVATION_CODE_ENABLED,
      metadata: { code: code.code },
    });
    return this.toActivationCodeDto(updated);
  }

  async deleteActivationCode(
    id: string,
    input: PlatformDeleteActivationCodeInput,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (input.confirmation !== "DELETE") {
      throw new BadRequestException("Type DELETE to confirm");
    }
    const code = await this.requireMutableActivationCode(id);
    await this.repository.deleteActivationCode(code.id);
    await this.repository.createPlatformAuditLog({
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: PLATFORM_AUDIT_ACTIONS.ACTIVATION_CODE_DELETED,
      metadata: { code: code.code },
    });
  }

  async exportActivationCodesCsv(): Promise<{ csv: string; filename: string }> {
    await this.repository.markExpiredActivationCodes();
    const rows = await this.repository.listAllActivationCodesForExport();
    const header = [
      "code",
      "status",
      "createdAt",
      "expiresAt",
      "usedAt",
      "usedByStudio",
      "usedByOwnerEmail",
      "notes",
    ];
    const lines = [
      header.join(","),
      ...rows.map((row) =>
        [
          row.code,
          row.status,
          row.createdAt.toISOString(),
          row.expiresAt?.toISOString() ?? "",
          row.usedAt?.toISOString() ?? "",
          row.usedByStudio?.name ?? "",
          row.usedByStudio?.members[0]?.email ?? "",
          (row.notes ?? "").replaceAll('"', '""'),
        ]
          .map((value) => `"${value}"`)
          .join(","),
      ),
    ];

    return {
      csv: lines.join("\n"),
      filename: `activation-codes-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = this.formatActivationCode();
      if (!(await this.repository.codeExists(code))) {
        return code;
      }
    }
    throw new BadRequestException("Unable to generate a unique activation code");
  }

  private formatActivationCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const segment = (length: number) => {
      const bytes = randomBytes(length);
      let out = "";
      for (let i = 0; i < length; i += 1) {
        out += alphabet[bytes[i]! % alphabet.length];
      }
      return out;
    };
    return `STM-${segment(4)}-${segment(4)}-${segment(4)}`;
  }

  private async requireActivationCode(id: string) {
    const code = await this.repository.findActivationCodeById(id);
    if (!code) {
      throw new NotFoundException("Activation code not found");
    }
    return code;
  }

  private async requireMutableActivationCode(id: string) {
    const code = await this.requireActivationCode(id);
    if (code.status === ACTIVATION_CODE_STATUSES.USED) {
      throw new BadRequestException("Used activation codes are read-only");
    }
    return code;
  }

  private toActivationCodeDto(row: {
    id: string;
    code: string;
    status: string;
    createdAt: Date;
    expiresAt: Date | null;
    usedAt: Date | null;
    usedByStudioId: string | null;
    generatedByPlatformAdmin: string;
    notes: string | null;
    usedByStudio?: {
      id: string;
      name: string;
      members: Array<{ email: string }>;
    } | null;
  }): PlatformActivationCodeDto {
    return {
      id: row.id,
      code: row.code,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
      usedAt: row.usedAt?.toISOString() ?? null,
      usedByStudioId: row.usedByStudioId,
      usedByStudioName: row.usedByStudio?.name ?? null,
      usedByOwnerEmail: row.usedByStudio?.members[0]?.email ?? null,
      generatedByPlatformAdmin: row.generatedByPlatformAdmin,
      notes: row.notes,
    };
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
