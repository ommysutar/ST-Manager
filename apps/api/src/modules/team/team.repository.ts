import { Injectable } from "@nestjs/common";
import type { PostgresPrismaClient } from "@st-manager/database";
import { Prisma } from "@st-manager/database";
import { INVITATION_STATUSES, MEMBER_STATUSES } from "@st-manager/constants";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

export interface UserMemberRecord {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  status: string;
  studioId: string | null;
  customPermissions: unknown;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface InvitationRecord {
  id: string;
  studioId: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  tokenHash: string;
  status: string;
  customPermissions: unknown;
  expiresAt: Date;
  invitedById: string;
  acceptedAt: Date | null;
  createdAt: Date;
  studio?: { name: string };
  invitedBy?: { email: string; fullName: string | null };
}

export interface PermissionRecord {
  key: string;
  label: string;
  category: string;
}

export interface RoleDefinitionRecord {
  name: string;
  label: string;
  isSystem: boolean;
  permissions: { permission: { key: string } }[];
}

@Injectable()
export class TeamRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findUserById(id: string): Promise<UserMemberRecord | null> {
    const client = asClient(this.prismaService.getClient());
    return client.user.findUnique({ where: { id } });
  }

  async findUserByEmail(email: string): Promise<UserMemberRecord | null> {
    const client = asClient(this.prismaService.getClient());
    return client.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async listMembersByStudio(studioId: string): Promise<UserMemberRecord[]> {
    const client = asClient(this.prismaService.getClient());
    return client.user.findMany({
      where: { studioId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
  }

  async listPendingInvitations(studioId: string): Promise<InvitationRecord[]> {
    const client = asClient(this.prismaService.getClient());
    return client.studioInvitation.findMany({
      where: { studioId, status: INVITATION_STATUSES.PENDING },
      orderBy: { createdAt: "desc" },
    });
  }

  async findInvitationByTokenHash(tokenHash: string): Promise<InvitationRecord | null> {
    const client = asClient(this.prismaService.getClient());
    return client.studioInvitation.findUnique({
      where: { tokenHash },
      include: {
        studio: { select: { name: true } },
        invitedBy: { select: { email: true, fullName: true } },
      },
    });
  }

  async findPendingInvitationByEmail(studioId: string, email: string): Promise<InvitationRecord | null> {
    const client = asClient(this.prismaService.getClient());
    return client.studioInvitation.findFirst({
      where: {
        studioId,
        email: email.toLowerCase(),
        status: INVITATION_STATUSES.PENDING,
      },
    });
  }

  async createInvitation(data: {
    studioId: string;
    email: string;
    fullName: string;
    phone?: string | null;
    role: string;
    tokenHash: string;
    expiresAt: Date;
    invitedById: string;
    customPermissions?: string[] | null;
  }): Promise<InvitationRecord> {
    const client = asClient(this.prismaService.getClient());
    return client.studioInvitation.create({
      data: {
        studioId: data.studioId,
        email: data.email.toLowerCase(),
        fullName: data.fullName,
        phone: data.phone ?? null,
        role: data.role,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        invitedById: data.invitedById,
        customPermissions: data.customPermissions ?? undefined,
      },
    });
  }

  async updateInvitation(
    id: string,
    data: Partial<{ status: string; acceptedAt: Date }>,
  ): Promise<InvitationRecord> {
    const client = asClient(this.prismaService.getClient());
    return client.studioInvitation.update({ where: { id }, data });
  }

  async updateMember(
    id: string,
    data: Partial<{
      fullName: string | null;
      phone: string | null;
      role: string;
      status: string;
      customPermissions: string[] | null;
    }>,
  ): Promise<UserMemberRecord> {
    const client = asClient(this.prismaService.getClient());
    const { customPermissions, ...rest } = data;
    const updateData: Prisma.UserUpdateInput = { ...rest };

    if (customPermissions !== undefined) {
      updateData.customPermissions =
        customPermissions === null ? Prisma.JsonNull : customPermissions;
    }

    return client.user.update({ where: { id }, data: updateData });
  }

  async createMemberFromInvitation(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string | null;
    role: string;
    studioId: string;
    customPermissions?: string[] | null;
  }): Promise<UserMemberRecord> {
    const client = asClient(this.prismaService.getClient());
    return client.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        phone: data.phone ?? null,
        role: data.role,
        studioId: data.studioId,
        status: MEMBER_STATUSES.ACTIVE,
        customPermissions: data.customPermissions ?? undefined,
      },
    });
  }

  async deleteMember(id: string): Promise<void> {
    const client = asClient(this.prismaService.getClient());
    await client.user.delete({ where: { id } });
  }

  async findInvitationById(id: string): Promise<InvitationRecord | null> {
    const client = asClient(this.prismaService.getClient());
    return client.studioInvitation.findUnique({
      where: { id },
      include: {
        studio: { select: { name: true } },
        invitedBy: { select: { email: true, fullName: true } },
      },
    });
  }

  async updateInvitationToken(
    id: string,
    data: { tokenHash: string; expiresAt: Date },
  ): Promise<InvitationRecord> {
    const client = asClient(this.prismaService.getClient());
    return client.studioInvitation.update({
      where: { id },
      data: {
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        status: INVITATION_STATUSES.PENDING,
      },
    });
  }

  async cancelInvitation(id: string): Promise<void> {
    const client = asClient(this.prismaService.getClient());
    await client.studioInvitation.update({
      where: { id },
      data: { status: INVITATION_STATUSES.CANCELLED },
    });
  }

  async listPermissions(): Promise<PermissionRecord[]> {
    const client = asClient(this.prismaService.getClient());
    return client.permission.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] });
  }

  async listSystemRoles(): Promise<RoleDefinitionRecord[]> {
    const client = asClient(this.prismaService.getClient());
    return client.roleDefinition.findMany({
      where: { studioId: null, isSystem: true },
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getStudioName(studioId: string): Promise<string | null> {
    const client = asClient(this.prismaService.getClient());
    const studio = await client.studio.findUnique({
      where: { id: studioId },
      select: { name: true },
    });
    return studio?.name ?? null;
  }

  async transferOwnership(studioId: string, currentOwnerId: string, newOwnerId: string): Promise<void> {
    const client = asClient(this.prismaService.getClient());
    await client.$transaction([
      client.user.update({
        where: { id: currentOwnerId },
        data: { role: "manager" },
      }),
      client.user.update({
        where: { id: newOwnerId },
        data: { role: "owner" },
      }),
    ]);
  }
}
