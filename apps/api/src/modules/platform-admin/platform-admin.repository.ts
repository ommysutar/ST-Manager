import { Injectable } from "@nestjs/common";
import {
  ACTIVATION_CODE_STATUSES,
  PLATFORM_ROLES,
  STUDIO_STATUSES,
  TEAM_ROLES,
} from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { PlatformStudioListQueryInput } from "@st-manager/validation";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

export interface PlatformAdminUserRecord {
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

@Injectable()
export class PlatformAdminRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async countPlatformAdmins(): Promise<number> {
    const client = asClient(this.prismaService.getClient());
    return client.user.count({
      where: { role: PLATFORM_ROLES.PLATFORM_ADMIN },
    });
  }

  async findByEmail(email: string): Promise<PlatformAdminUserRecord | null> {
    const client = asClient(this.prismaService.getClient());
    return client.user.findUnique({ where: { email } });
  }

  async findUserById(id: string): Promise<PlatformAdminUserRecord | null> {
    const client = asClient(this.prismaService.getClient());
    return client.user.findUnique({ where: { id } });
  }

  async findStudioStatusByUserId(userId: string): Promise<string | null> {
    const client = asClient(this.prismaService.getClient());
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { studio: { select: { status: true } } },
    });
    return user?.studio?.status ?? null;
  }

  async createPlatformAdmin(input: {
    email: string;
    passwordHash: string;
    fullName: string;
  }): Promise<PlatformAdminUserRecord> {
    const client = asClient(this.prismaService.getClient());
    return client.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        role: PLATFORM_ROLES.PLATFORM_ADMIN,
        studioId: null,
        status: "active",
      },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    const client = asClient(this.prismaService.getClient());
    await client.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async getDashboardCounts() {
    const client = asClient(this.prismaService.getClient());
    const [
      totalStudios,
      activeStudios,
      disabledStudios,
      archivedStudios,
      totalUsers,
      verifiedUsers,
      activationCodes,
      usedActivationCodes,
      pendingActivationCodes,
    ] = await Promise.all([
      client.studio.count(),
      client.studio.count({ where: { status: STUDIO_STATUSES.ACTIVE } }),
      client.studio.count({ where: { status: STUDIO_STATUSES.DISABLED } }),
      client.studio.count({ where: { status: STUDIO_STATUSES.ARCHIVED } }),
      client.user.count({ where: { role: { not: PLATFORM_ROLES.PLATFORM_ADMIN } } }),
      client.user.count({
        where: {
          role: { not: PLATFORM_ROLES.PLATFORM_ADMIN },
          lastLoginAt: { not: null },
        },
      }),
      client.activationCode.count(),
      client.activationCode.count({ where: { status: ACTIVATION_CODE_STATUSES.USED } }),
      client.activationCode.count({ where: { status: ACTIVATION_CODE_STATUSES.ACTIVE } }),
    ]);

    return {
      totalStudios,
      activeStudios,
      disabledStudios,
      archivedStudios,
      totalUsers,
      verifiedUsers,
      activationCodes,
      usedActivationCodes,
      pendingActivationCodes,
    };
  }

  async listStudios(query: PlatformStudioListQueryInput) {
    const client = asClient(this.prismaService.getClient());
    const search = query.search?.trim();
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              {
                members: {
                  some: {
                    role: TEAM_ROLES.OWNER,
                    OR: [
                      { fullName: { contains: search } },
                      { email: { contains: search } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, studios] = await Promise.all([
      client.studio.count({ where }),
      client.studio.findMany({
        where,
        include: {
          members: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              status: true,
              lastLoginAt: true,
            },
          },
          _count: { select: { members: true } },
        },
        orderBy:
          query.sortBy === "name"
            ? { name: query.sortOrder }
            : query.sortBy === "status"
              ? { status: query.sortOrder }
              : { createdAt: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    let rows = studios.map((studio) => {
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
    });

    if (query.sortBy === "totalUsers") {
      rows = rows.sort((a, b) =>
        query.sortOrder === "asc" ? a.totalUsers - b.totalUsers : b.totalUsers - a.totalUsers,
      );
    }

    return { total, rows };
  }

  async findStudioDetail(studioId: string) {
    const client = asClient(this.prismaService.getClient());
    const studio = await client.studio.findUnique({
      where: { id: studioId },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            lastLoginAt: true,
          },
        },
        _count: {
          select: {
            members: true,
            bookings: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!studio) {
      return null;
    }

    const clientIds = await client.booking.findMany({
      where: { studioId, deletedAt: null, clientId: { not: null } },
      select: { clientId: true },
      distinct: ["clientId"],
    });

    const owner = studio.members.find((m) => m.role === TEAM_ROLES.OWNER) ?? null;
    const lastLoginAt = studio.members
      .map((m) => m.lastLoginAt)
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      id: studio.id,
      name: studio.name,
      status: studio.status,
      createdAt: studio.createdAt.toISOString(),
      archivedAt: studio.archivedAt?.toISOString() ?? null,
      owner: owner
        ? {
            id: owner.id,
            fullName: owner.fullName,
            email: owner.email,
            lastLoginAt: owner.lastLoginAt?.toISOString() ?? null,
          }
        : null,
      members: studio.members.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        role: m.role,
        status: m.status,
        lastLoginAt: m.lastLoginAt?.toISOString() ?? null,
      })),
      totalUsers: studio._count.members,
      totalProjects: 0,
      totalBookings: studio._count.bookings,
      totalClients: clientIds.length,
      storageUsed: "—",
      lastLoginAt: lastLoginAt?.toISOString() ?? null,
    };
  }

  async updateStudioStatus(
    studioId: string,
    status: string,
    archivedAt: Date | null,
  ) {
    const client = asClient(this.prismaService.getClient());
    return client.studio.update({
      where: { id: studioId },
      data: { status, archivedAt },
      include: {
        members: {
          select: { fullName: true, email: true, role: true },
        },
        _count: { select: { members: true } },
      },
    });
  }

  async findStudioById(studioId: string) {
    const client = asClient(this.prismaService.getClient());
    return client.studio.findUnique({ where: { id: studioId } });
  }

  async createPlatformAuditLog(input: {
    actorUserId: string | null;
    actorEmail: string;
    action: string;
    studioId?: string | null;
    studioName?: string | null;
    metadata?: Record<string, string | number | boolean | null>;
  }): Promise<void> {
    const client = asClient(this.prismaService.getClient());
    await client.platformAuditLog.create({
      data: {
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        action: input.action,
        studioId: input.studioId ?? null,
        studioName: input.studioName ?? null,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    });
  }

  async listRecentAuditLogs(limit = 50): Promise<
    Array<{
      id: string;
      actorEmail: string;
      action: string;
      studioId: string | null;
      studioName: string | null;
      createdAt: Date;
    }>
  > {
    const client = asClient(this.prismaService.getClient());
    return client.platformAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        actorEmail: true,
        action: true,
        studioId: true,
        studioName: true,
        createdAt: true,
      },
    });
  }

  async getActivationCodeSummary() {
    const client = asClient(this.prismaService.getClient());
    const [totalCodes, activeCodes, usedCodes, disabledCodes, expiredCodes] = await Promise.all([
      client.activationCode.count(),
      client.activationCode.count({ where: { status: ACTIVATION_CODE_STATUSES.ACTIVE } }),
      client.activationCode.count({ where: { status: ACTIVATION_CODE_STATUSES.USED } }),
      client.activationCode.count({ where: { status: ACTIVATION_CODE_STATUSES.DISABLED } }),
      client.activationCode.count({ where: { status: ACTIVATION_CODE_STATUSES.EXPIRED } }),
    ]);
    return { totalCodes, activeCodes, usedCodes, disabledCodes, expiredCodes };
  }

  async markExpiredActivationCodes(): Promise<void> {
    const client = asClient(this.prismaService.getClient());
    await client.activationCode.updateMany({
      where: {
        status: ACTIVATION_CODE_STATUSES.ACTIVE,
        expiresAt: { lt: new Date() },
      },
      data: { status: ACTIVATION_CODE_STATUSES.EXPIRED },
    });
  }

  async listActivationCodes(query: {
    search?: string;
    page: number;
    pageSize: number;
    sortBy: "code" | "status" | "createdAt" | "expiresAt";
    sortOrder: "asc" | "desc";
    status?: string;
  }) {
    const client = asClient(this.prismaService.getClient());
    const search = query.search?.trim();
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search } },
              { notes: { contains: search } },
              { usedByStudio: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      client.activationCode.count({ where }),
      client.activationCode.findMany({
        where,
        include: {
          usedByStudio: {
            select: {
              id: true,
              name: true,
              members: {
                where: { role: TEAM_ROLES.OWNER },
                select: { email: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { total, rows };
  }

  async listAllActivationCodesForExport() {
    const client = asClient(this.prismaService.getClient());
    return client.activationCode.findMany({
      include: {
        usedByStudio: {
          select: {
            name: true,
            members: {
              where: { role: TEAM_ROLES.OWNER },
              select: { email: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async codeExists(code: string): Promise<boolean> {
    const client = asClient(this.prismaService.getClient());
    const existing = await client.activationCode.findUnique({ where: { code } });
    return Boolean(existing);
  }

  async createActivationCodes(
    codes: Array<{
      code: string;
      expiresAt: Date | null;
      notes: string | null;
      generatedByPlatformAdmin: string;
    }>,
  ) {
    const client = asClient(this.prismaService.getClient());
    await client.activationCode.createMany({
      data: codes.map((item) => ({
        code: item.code,
        status: ACTIVATION_CODE_STATUSES.ACTIVE,
        expiresAt: item.expiresAt,
        notes: item.notes,
        generatedByPlatformAdmin: item.generatedByPlatformAdmin,
      })),
    });
    return client.activationCode.findMany({
      where: { code: { in: codes.map((c) => c.code) } },
      include: {
        usedByStudio: {
          select: {
            id: true,
            name: true,
            members: {
              where: { role: TEAM_ROLES.OWNER },
              select: { email: true },
              take: 1,
            },
          },
        },
      },
    });
  }

  async findActivationCodeById(id: string) {
    const client = asClient(this.prismaService.getClient());
    return client.activationCode.findUnique({
      where: { id },
      include: {
        usedByStudio: {
          select: {
            id: true,
            name: true,
            members: {
              where: { role: TEAM_ROLES.OWNER },
              select: { email: true },
              take: 1,
            },
          },
        },
      },
    });
  }

  async updateActivationCodeStatus(id: string, status: string) {
    const client = asClient(this.prismaService.getClient());
    return client.activationCode.update({
      where: { id },
      data: { status },
      include: {
        usedByStudio: {
          select: {
            id: true,
            name: true,
            members: {
              where: { role: TEAM_ROLES.OWNER },
              select: { email: true },
              take: 1,
            },
          },
        },
      },
    });
  }

  async deleteActivationCode(id: string): Promise<void> {
    const client = asClient(this.prismaService.getClient());
    await client.activationCode.delete({ where: { id } });
  }
}
