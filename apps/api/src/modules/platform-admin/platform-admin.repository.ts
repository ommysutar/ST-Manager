import { Injectable } from "@nestjs/common";
import { PLATFORM_ROLES } from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";

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

  async countStudios(): Promise<number> {
    const client = asClient(this.prismaService.getClient());
    return client.studio.count();
  }

  async countUsers(): Promise<number> {
    const client = asClient(this.prismaService.getClient());
    return client.user.count();
  }
}
