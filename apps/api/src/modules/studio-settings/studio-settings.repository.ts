import { Injectable } from "@nestjs/common";
import { SYNC } from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { StudioSettings } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  EMPTY_STUDIO_SETTINGS_JSON,
  normalizeStudioSettingsJson,
} from "./studio-settings.mapper";

function asStudioSettingsClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_STUDIO_SETTINGS_FILTER = { deletedAt: null } as const;

function toStudioSettings(row: {
  id: string;
  studioId: string;
  profile: unknown;
  whatsapp: unknown;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): StudioSettings {
  const json = normalizeStudioSettingsJson(row);
  return {
    ...row,
    profile: json.profile,
    whatsapp: json.whatsapp,
  };
}

@Injectable()
export class StudioSettingsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findActiveByStudioId(studioId: string): Promise<StudioSettings | null> {
    const client = asStudioSettingsClient(this.prismaService.getClient());
    const row = await client.studioSettings.findFirst({
      where: {
        studioId,
        ...ACTIVE_STUDIO_SETTINGS_FILTER,
      },
    });
    return row ? toStudioSettings(row) : null;
  }

  async createDefault(studioId: string): Promise<StudioSettings> {
    const client = asStudioSettingsClient(this.prismaService.getClient());
    const row = await client.studioSettings.create({
      data: {
        studioId,
        profile: EMPTY_STUDIO_SETTINGS_JSON.profile,
        whatsapp: EMPTY_STUDIO_SETTINGS_JSON.whatsapp,
      },
    });
    return toStudioSettings(row);
  }

  async findOrCreate(studioId: string): Promise<StudioSettings> {
    const existing = await this.findActiveByStudioId(studioId);
    if (existing) {
      return existing;
    }
    return this.createDefault(studioId);
  }

  async upsert(
    studioId: string,
    data: Partial<{ profile: unknown; whatsapp: unknown }>,
  ): Promise<StudioSettings> {
    const client = asStudioSettingsClient(this.prismaService.getClient());
    const existing = await client.studioSettings.findUnique({
      where: { studioId },
    });

    if (!existing) {
      const row = await client.studioSettings.create({
        data: {
          studioId,
          profile: JSON.parse(
            JSON.stringify(data.profile ?? EMPTY_STUDIO_SETTINGS_JSON.profile),
          ),
          whatsapp: JSON.parse(
            JSON.stringify(data.whatsapp ?? EMPTY_STUDIO_SETTINGS_JSON.whatsapp),
          ),
        },
      });
      return toStudioSettings(row);
    }

    const row = await client.studioSettings.update({
      where: { studioId },
      data: {
        ...(data.profile !== undefined
          ? { profile: JSON.parse(JSON.stringify(data.profile)) }
          : {}),
        ...(data.whatsapp !== undefined
          ? { whatsapp: JSON.parse(JSON.stringify(data.whatsapp)) }
          : {}),
        deletedAt: null,
      },
    });
    return toStudioSettings(row);
  }

  async findChangesSince(params: {
    studioId: string;
    since?: Date;
    take?: number;
  }): Promise<StudioSettings[]> {
    const client = asStudioSettingsClient(this.prismaService.getClient());
    const take = params.take ?? SYNC.MAX_STUDIO_SETTINGS_PULL_BATCH;
    const rows = await client.studioSettings.findMany({
      where: {
        studioId: params.studioId,
        ...(params.since ? { updatedAt: { gt: params.since } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take,
    });
    return rows.map(toStudioSettings);
  }
}
