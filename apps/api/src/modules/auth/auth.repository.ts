import { Injectable } from "@nestjs/common";
import type { PostgresPrismaClient } from "@st-manager/database";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
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
  ): Promise<AuthUserRecord> {
    const client = asAuthClient(this.prismaService.getClient());
    return client.user.create({
      data: { email, passwordHash, role },
    });
  }
}
