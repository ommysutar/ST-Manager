import { Injectable } from "@nestjs/common";
import { SYNC } from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { Client } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asClientClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_CLIENT_FILTER = { deletedAt: null } as const;

@Injectable()
export class ClientsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private buildSearchFilter(search?: string) {
    if (!search) {
      return {};
    }

    if (this.prismaService.provider === "postgresql") {
      return {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      };
    }

    return {
      name: {
        contains: search,
      },
    };
  }

  async create(data: {
    studioId: string;
    name: string;
    email: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    whatsappSameAsPhone: boolean;
    company: string | null;
    notes: string | null;
  }): Promise<Client> {
    const client = asClientClient(this.prismaService.getClient());
    return client.client.create({ data });
  }

  /**
   * Find an active client. When studioId is provided, enforces tenant ownership.
   */
  async findById(id: string, studioId?: string): Promise<Client | null> {
    const client = asClientClient(this.prismaService.getClient());
    return client.client.findFirst({
      where: {
        id,
        ...(studioId ? { studioId } : {}),
        ...ACTIVE_CLIENT_FILTER,
      },
    });
  }

  async findMany(params: {
    studioId: string;
    skip: number;
    take: number;
    search?: string;
  }): Promise<Client[]> {
    const client = asClientClient(this.prismaService.getClient());
    return client.client.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_CLIENT_FILTER,
        ...this.buildSearchFilter(params.search),
      },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
  }

  async count(studioId: string, search?: string): Promise<number> {
    const client = asClientClient(this.prismaService.getClient());
    return client.client.count({
      where: {
        studioId,
        ...ACTIVE_CLIENT_FILTER,
        ...this.buildSearchFilter(search),
      },
    });
  }

  async findChangesSince(params: {
    studioId: string;
    since?: Date;
    take?: number;
  }): Promise<Client[]> {
    const client = asClientClient(this.prismaService.getClient());
    const take = params.take ?? SYNC.MAX_CLIENTS_PULL_BATCH;
    return client.client.findMany({
      where: {
        studioId: params.studioId,
        ...(params.since
          ? { updatedAt: { gt: params.since } }
          : { ...ACTIVE_CLIENT_FILTER }),
      },
      orderBy: { updatedAt: "asc" },
      take,
    });
  }

  async update(
    id: string,
    studioId: string,
    data: Partial<{
      name: string;
      email: string | null;
      phone: string | null;
      whatsappNumber: string | null;
      whatsappSameAsPhone: boolean;
      company: string | null;
      notes: string | null;
    }>,
  ): Promise<Client> {
    const client = asClientClient(this.prismaService.getClient());
    const existing = await client.client.findFirst({
      where: { id, studioId, ...ACTIVE_CLIENT_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`CLIENT_NOT_FOUND:${id}`);
    }
    return client.client.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, studioId: string): Promise<Client> {
    const client = asClientClient(this.prismaService.getClient());
    const existing = await client.client.findFirst({
      where: { id, studioId, ...ACTIVE_CLIENT_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`CLIENT_NOT_FOUND:${id}`);
    }
    return client.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
