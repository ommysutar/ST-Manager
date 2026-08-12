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

function parseDisplayNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const match = value.match(/^CL-(\d+)$/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function formatDisplayNumber(n: number): string {
  return `CL-${String(n).padStart(4, "0")}`;
}

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

  private async nextDisplayNumber(
    tx: { client: PostgresPrismaClient["client"] },
    studioId: string,
  ): Promise<string> {
    const rows = await tx.client.findMany({
      where: { studioId },
      select: { displayNumber: true },
    });
    const max = rows.reduce(
      (acc, row) => Math.max(acc, parseDisplayNumber(row.displayNumber)),
      0,
    );
    return formatDisplayNumber(max + 1);
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
    return client.$transaction(async (tx) => {
      const displayNumber = await this.nextDisplayNumber(tx, data.studioId);
      return tx.client.create({
        data: {
          ...data,
          displayNumber,
        },
      });
    });
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

  async findActiveByPhoneOrEmail(params: {
    studioId: string;
    phone?: string | null;
    email?: string | null;
  }): Promise<Client | null> {
    const phone = params.phone?.trim() || null;
    const email = params.email?.trim().toLowerCase() || null;
    if (!phone && !email) {
      return null;
    }

    const client = asClientClient(this.prismaService.getClient());
    const or: Array<{ phone?: string; email?: string }> = [];
    if (phone) {
      or.push({ phone });
    }
    if (email) {
      or.push({ email });
    }

    const rows = await client.client.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_CLIENT_FILTER,
        OR: or,
      },
      take: 5,
    });

    if (phone) {
      const byPhone = rows.find((row) => (row.phone?.trim() ?? "") === phone);
      if (byPhone) return byPhone;
    }
    if (email) {
      const byEmail = rows.find(
        (row) => (row.email?.trim().toLowerCase() ?? "") === email,
      );
      if (byEmail) return byEmail;
    }
    return null;
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
