import { Injectable } from "@nestjs/common";
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

  async findById(id: string): Promise<Client | null> {
    const client = asClientClient(this.prismaService.getClient());
    return client.client.findFirst({
      where: { id, ...ACTIVE_CLIENT_FILTER },
    });
  }

  async findMany(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<Client[]> {
    const client = asClientClient(this.prismaService.getClient());
    return client.client.findMany({
      where: {
        ...ACTIVE_CLIENT_FILTER,
        ...this.buildSearchFilter(params.search),
      },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
  }

  async count(search?: string): Promise<number> {
    const client = asClientClient(this.prismaService.getClient());
    return client.client.count({
      where: {
        ...ACTIVE_CLIENT_FILTER,
        ...this.buildSearchFilter(search),
      },
    });
  }

  async update(
    id: string,
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
    return client.client.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Client> {
    const client = asClientClient(this.prismaService.getClient());
    return client.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
