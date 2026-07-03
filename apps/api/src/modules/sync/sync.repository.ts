import { Injectable } from "@nestjs/common";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { Studio } from "@st-manager/types";
import type { SyncStudiosPushInput } from "@st-manager/validation";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asStudioClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

export type SyncPushResultStatus = "created" | "updated" | "unchanged";

@Injectable()
export class SyncRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async upsertStudio(
    item: SyncStudiosPushInput["studios"][number],
  ): Promise<SyncPushResultStatus> {
    const client = asStudioClient(this.prismaService.getClient());
    const existing = await client.studio.findUnique({ where: { id: item.id } });

    if (!existing) {
      await client.studio.create({
        data: {
          id: item.id,
          name: item.name,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
      return "created";
    }

    const clientUpdatedAt = new Date(item.updatedAt);
    const unchanged =
      existing.name === item.name && existing.updatedAt.getTime() === clientUpdatedAt.getTime();

    if (unchanged) {
      return "unchanged";
    }

    if (existing.updatedAt.getTime() <= clientUpdatedAt.getTime()) {
      await client.studio.update({
        where: { id: item.id },
        data: {
          name: item.name,
          updatedAt: clientUpdatedAt,
        },
      });
      return "updated";
    }

    return "unchanged";
  }

  async findUpdatedSince(since: Date | undefined, take: number): Promise<Studio[]> {
    const client = asStudioClient(this.prismaService.getClient());
    return client.studio.findMany({
      where: since ? { updatedAt: { gt: since } } : undefined,
      orderBy: { updatedAt: "asc" },
      take,
    });
  }
}
