import { Injectable } from "@nestjs/common";
import {
  ACTIVATION_CODE_ERROR_MESSAGES,
  ACTIVATION_CODE_STATUSES,
  LICENSE_TYPES,
  PLATFORM_AUDIT_ACTIONS,
  TRIAL_DEFAULT_DAYS,
} from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  fullName: string | null;
  phone: string | null;
  studioId: string | null;
  status: string;
  lastLoginAt: Date | null;
}

export class ActivationCodeRedeemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActivationCodeRedeemError";
  }
}

function asAuthClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    const client = asAuthClient(this.prismaService.getClient());
    return client.user.findUnique({ where: { email } });
  }

  async findByEmailWithStudio(email: string): Promise<
    (AuthUserRecord & { studio: { id: string; status: string; name: string } | null }) | null
  > {
    const client = asAuthClient(this.prismaService.getClient());
    return client.user.findUnique({
      where: { email },
      include: { studio: { select: { id: true, status: true, name: true } } },
    });
  }

  async findByIdWithStudio(id: string): Promise<
    (AuthUserRecord & { studio: { id: string; status: string; name: string } | null }) | null
  > {
    const client = asAuthClient(this.prismaService.getClient());
    return client.user.findUnique({
      where: { id },
      include: { studio: { select: { id: true, status: true, name: true } } },
    });
  }

  async findById(id: string): Promise<AuthUserRecord | null> {
    const client = asAuthClient(this.prismaService.getClient());
    return client.user.findUnique({ where: { id } });
  }

  async createUser(
    email: string,
    passwordHash: string,
    role: string,
    data?: {
      fullName?: string;
      studioId?: string;
    },
  ): Promise<AuthUserRecord> {
    const client = asAuthClient(this.prismaService.getClient());
    return client.user.create({
      data: {
        email,
        passwordHash,
        role,
        fullName: data?.fullName ?? null,
        studioId: data?.studioId ?? null,
      },
    });
  }

  async createStudioWithOwner(input: {
    studioName: string;
    ownerName: string;
    email: string;
    passwordHash: string;
    activationCode: string;
  }): Promise<AuthUserRecord> {
    const client = asAuthClient(this.prismaService.getClient());
    return client.$transaction(async (tx) => {
      const code = await tx.activationCode.findUnique({
        where: { code: input.activationCode },
      });

      if (!code) {
        throw new ActivationCodeRedeemError(ACTIVATION_CODE_ERROR_MESSAGES.INVALID);
      }

      if (code.status === ACTIVATION_CODE_STATUSES.USED) {
        throw new ActivationCodeRedeemError(ACTIVATION_CODE_ERROR_MESSAGES.USED);
      }

      if (code.status === ACTIVATION_CODE_STATUSES.DISABLED) {
        throw new ActivationCodeRedeemError(ACTIVATION_CODE_ERROR_MESSAGES.DISABLED);
      }

      if (code.status === ACTIVATION_CODE_STATUSES.EXPIRED) {
        throw new ActivationCodeRedeemError(ACTIVATION_CODE_ERROR_MESSAGES.EXPIRED);
      }

      if (code.status === ACTIVATION_CODE_STATUSES.REVOKED) {
        throw new ActivationCodeRedeemError(ACTIVATION_CODE_ERROR_MESSAGES.REVOKED);
      }

      if (code.status !== ACTIVATION_CODE_STATUSES.ACTIVE) {
        throw new ActivationCodeRedeemError(ACTIVATION_CODE_ERROR_MESSAGES.INVALID);
      }

      if (code.expiresAt && code.expiresAt.getTime() <= Date.now()) {
        await tx.activationCode.update({
          where: { id: code.id },
          data: { status: ACTIVATION_CODE_STATUSES.EXPIRED },
        });
        throw new ActivationCodeRedeemError(ACTIVATION_CODE_ERROR_MESSAGES.EXPIRED);
      }

      await tx.platformAuditLog.create({
        data: {
          actorUserId: null,
          actorEmail: input.email,
          action: PLATFORM_AUDIT_ACTIONS.ACTIVATION_CODE_VALIDATED,
          metadata: { code: code.code },
        },
      });

      const studio = await tx.studio.create({
        data: { name: input.studioName },
      });

      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          role: "owner",
          fullName: input.ownerName,
          studioId: studio.id,
        },
      });

      const activatedAt = new Date();
      let expiresAt: Date | null | undefined;
      if (code.licenseType === LICENSE_TYPES.TRIAL) {
        expiresAt = new Date(activatedAt);
        expiresAt.setUTCDate(expiresAt.getUTCDate() + TRIAL_DEFAULT_DAYS);
      } else if (
        code.licenseType === LICENSE_TYPES.SUBSCRIPTION &&
        code.subscriptionMonths &&
        code.subscriptionMonths > 0
      ) {
        expiresAt = new Date(activatedAt);
        expiresAt.setUTCMonth(expiresAt.getUTCMonth() + code.subscriptionMonths);
      }

      const redeemed = await tx.activationCode.updateMany({
        where: {
          id: code.id,
          status: ACTIVATION_CODE_STATUSES.ACTIVE,
        },
        data: {
          status: ACTIVATION_CODE_STATUSES.USED,
          usedAt: activatedAt,
          activatedAt,
          usedByStudioId: studio.id,
          usedByOwnerEmail: input.email,
          ...(expiresAt !== undefined ? { expiresAt } : {}),
        },
      });

      if (redeemed.count !== 1) {
        throw new ActivationCodeRedeemError(ACTIVATION_CODE_ERROR_MESSAGES.USED);
      }

      await tx.platformAuditLog.create({
        data: {
          actorUserId: user.id,
          actorEmail: input.email,
          action: PLATFORM_AUDIT_ACTIONS.ACTIVATION_CODE_USED,
          studioId: studio.id,
          studioName: studio.name,
          metadata: { code: code.code },
        },
      });

      await tx.platformAuditLog.create({
        data: {
          actorUserId: user.id,
          actorEmail: input.email,
          action: PLATFORM_AUDIT_ACTIONS.STUDIO_ACTIVATED,
          studioId: studio.id,
          studioName: studio.name,
          metadata: { code: code.code },
        },
      });

      return user;
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    const client = asAuthClient(this.prismaService.getClient());
    await client.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
