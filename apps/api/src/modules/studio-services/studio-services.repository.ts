import { Injectable } from "@nestjs/common";
import { SYNC } from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { ServicePrices, StudioService } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { normalizeServicePrices } from "./studio-services.mapper";

function asStudioServiceClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_STUDIO_SERVICE_FILTER = { deletedAt: null } as const;

function toStudioService(row: {
  id: string;
  studioId: string;
  name: string;
  category: string;
  description: string;
  active: boolean;
  mandatory: boolean;
  isStudioRent: boolean;
  sortOrder: number;
  legacyPrice: number;
  prices: unknown;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): StudioService {
  return {
    ...row,
    prices: normalizeServicePrices(row.prices),
  };
}

@Injectable()
export class StudioServicesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private buildSearchFilter(search?: string) {
    if (!search) {
      return {};
    }

    if (this.prismaService.provider === "postgresql") {
      return {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { category: { contains: search, mode: "insensitive" as const } },
        ],
      };
    }

    return {
      OR: [{ name: { contains: search } }, { category: { contains: search } }],
    };
  }

  async create(data: {
    studioId: string;
    name: string;
    category: string;
    description: string;
    active: boolean;
    mandatory: boolean;
    isStudioRent: boolean;
    sortOrder: number;
    legacyPrice: number;
    prices: ServicePrices;
  }): Promise<StudioService> {
    const client = asStudioServiceClient(this.prismaService.getClient());
    const row = await client.studioService.create({
      data: {
        ...data,
        prices: JSON.parse(JSON.stringify(data.prices)),
      },
    });
    return toStudioService(row);
  }

  async findById(id: string, studioId?: string): Promise<StudioService | null> {
    const client = asStudioServiceClient(this.prismaService.getClient());
    const row = await client.studioService.findFirst({
      where: {
        id,
        ...(studioId ? { studioId } : {}),
        ...ACTIVE_STUDIO_SERVICE_FILTER,
      },
    });
    return row ? toStudioService(row) : null;
  }

  async findMany(params: {
    studioId: string;
    skip: number;
    take: number;
    search?: string;
  }): Promise<StudioService[]> {
    const client = asStudioServiceClient(this.prismaService.getClient());
    const rows = await client.studioService.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_STUDIO_SERVICE_FILTER,
        ...this.buildSearchFilter(params.search),
      },
      skip: params.skip,
      take: params.take,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows.map(toStudioService);
  }

  async count(studioId: string, search?: string): Promise<number> {
    const client = asStudioServiceClient(this.prismaService.getClient());
    return client.studioService.count({
      where: {
        studioId,
        ...ACTIVE_STUDIO_SERVICE_FILTER,
        ...this.buildSearchFilter(search),
      },
    });
  }

  async findChangesSince(params: {
    studioId: string;
    since?: Date;
    take?: number;
  }): Promise<StudioService[]> {
    const client = asStudioServiceClient(this.prismaService.getClient());
    const take = params.take ?? SYNC.MAX_STUDIO_SERVICES_PULL_BATCH;
    const rows = await client.studioService.findMany({
      where: {
        studioId: params.studioId,
        ...(params.since ? { updatedAt: { gt: params.since } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take,
    });
    return rows.map(toStudioService);
  }

  async update(
    id: string,
    studioId: string,
    data: Partial<{
      name: string;
      category: string;
      description: string;
      active: boolean;
      mandatory: boolean;
      isStudioRent: boolean;
      sortOrder: number;
      legacyPrice: number;
      prices: ServicePrices;
    }>,
  ): Promise<StudioService> {
    const client = asStudioServiceClient(this.prismaService.getClient());
    const existing = await client.studioService.findFirst({
      where: { id, studioId, ...ACTIVE_STUDIO_SERVICE_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`STUDIO_SERVICE_NOT_FOUND:${id}`);
    }
    const row = await client.studioService.update({
      where: { id },
      data: {
        ...data,
        ...(data.prices !== undefined
          ? { prices: JSON.parse(JSON.stringify(data.prices)) }
          : {}),
      },
    });
    return toStudioService(row);
  }

  async softDelete(id: string, studioId: string): Promise<StudioService> {
    const client = asStudioServiceClient(this.prismaService.getClient());
    const existing = await client.studioService.findFirst({
      where: { id, studioId, ...ACTIVE_STUDIO_SERVICE_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`STUDIO_SERVICE_NOT_FOUND:${id}`);
    }
    const row = await client.studioService.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    return toStudioService(row);
  }
}
