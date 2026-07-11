import { Injectable } from "@nestjs/common";
import type { PostgresPrismaClient } from "@st-manager/database";
import { Prisma } from "@st-manager/database";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

export type ClientPortalLinkRecord = {
  id: string;
  studioId: string;
  projectKey: string;
  tokenHash: string;
  status: string;
  expiresAt: Date | null;
  completedAt: Date | null;
  snapshot: Prisma.JsonValue;
  studioMessage: string | null;
  disabledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ClientPortalRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findByStudioAndProject(studioId: string, projectKey: string): Promise<ClientPortalLinkRecord | null> {
    const client = asClient(this.prismaService.getClient());
    return client.clientPortalLink.findUnique({
      where: { studioId_projectKey: { studioId, projectKey } },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<ClientPortalLinkRecord | null> {
    const client = asClient(this.prismaService.getClient());
    return client.clientPortalLink.findUnique({ where: { tokenHash } });
  }

  async create(data: {
    studioId: string;
    projectKey: string;
    tokenHash: string;
    status: string;
    expiresAt: Date | null;
    completedAt: Date | null;
    snapshot: unknown;
    studioMessage: string | null;
  }): Promise<ClientPortalLinkRecord> {
    const client = asClient(this.prismaService.getClient());
    return client.clientPortalLink.create({
      data: {
        ...data,
        snapshot: data.snapshot as Prisma.InputJsonValue,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      tokenHash: string;
      status: string;
      expiresAt: Date | null;
      completedAt: Date | null;
      snapshot: unknown;
      studioMessage: string | null;
      disabledAt: Date | null;
    }>,
  ): Promise<ClientPortalLinkRecord> {
    const client = asClient(this.prismaService.getClient());
    const { snapshot, ...rest } = data;
    return client.clientPortalLink.update({
      where: { id },
      data: {
        ...rest,
        ...(snapshot !== undefined
          ? { snapshot: snapshot as Prisma.InputJsonValue }
          : {}),
      },
    });
  }
}
