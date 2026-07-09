import { Injectable } from "@nestjs/common";
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
  }): Promise<AuthUserRecord> {
    const client = asAuthClient(this.prismaService.getClient());
    return client.$transaction(async (tx) => {
      const studio = await tx.studio.create({
        data: { name: input.studioName },
      });

      return tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          role: "owner",
          fullName: input.ownerName,
          studioId: studio.id,
        },
      });
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
