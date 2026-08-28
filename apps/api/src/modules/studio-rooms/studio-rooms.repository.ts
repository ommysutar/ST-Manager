import { Injectable } from "@nestjs/common";
import { SYNC } from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { StudioRoom } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asStudioRoomClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_STUDIO_ROOM_FILTER = { deletedAt: null } as const;

function toStudioRoom(row: {
  id: string;
  studioId: string;
  name: string;
  roomName: string | null;
  description: string;
  color: string;
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): StudioRoom {
  return row;
}

@Injectable()
export class StudioRoomsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private buildSearchFilter(search?: string) {
    if (!search) {
      return {};
    }

    if (this.prismaService.provider === "postgresql") {
      return {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { roomName: { contains: search, mode: "insensitive" as const } },
        ],
      };
    }

    return {
      OR: [{ name: { contains: search } }, { roomName: { contains: search } }],
    };
  }

  async create(data: {
    studioId: string;
    name: string;
    roomName: string | null;
    description: string;
    color: string;
    active: boolean;
  }): Promise<StudioRoom> {
    const client = asStudioRoomClient(this.prismaService.getClient());
    const row = await client.studioRoom.create({ data });
    return toStudioRoom(row);
  }

  async findById(id: string, studioId?: string): Promise<StudioRoom | null> {
    const client = asStudioRoomClient(this.prismaService.getClient());
    const row = await client.studioRoom.findFirst({
      where: {
        id,
        ...(studioId ? { studioId } : {}),
        ...ACTIVE_STUDIO_ROOM_FILTER,
      },
    });
    return row ? toStudioRoom(row) : null;
  }

  async findMany(params: {
    studioId: string;
    skip: number;
    take: number;
    search?: string;
  }): Promise<StudioRoom[]> {
    const client = asStudioRoomClient(this.prismaService.getClient());
    const rows = await client.studioRoom.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_STUDIO_ROOM_FILTER,
        ...this.buildSearchFilter(params.search),
      },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toStudioRoom);
  }

  async count(studioId: string, search?: string): Promise<number> {
    const client = asStudioRoomClient(this.prismaService.getClient());
    return client.studioRoom.count({
      where: {
        studioId,
        ...ACTIVE_STUDIO_ROOM_FILTER,
        ...this.buildSearchFilter(search),
      },
    });
  }

  async findChangesSince(params: {
    studioId: string;
    since?: Date;
    take?: number;
  }): Promise<StudioRoom[]> {
    const client = asStudioRoomClient(this.prismaService.getClient());
    const take = params.take ?? SYNC.MAX_STUDIO_ROOMS_PULL_BATCH;
    const rows = await client.studioRoom.findMany({
      where: {
        studioId: params.studioId,
        ...(params.since ? { updatedAt: { gt: params.since } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take,
    });
    return rows.map(toStudioRoom);
  }

  async update(
    id: string,
    studioId: string,
    data: Partial<{
      name: string;
      roomName: string | null;
      description: string;
      color: string;
      active: boolean;
    }>,
  ): Promise<StudioRoom> {
    const client = asStudioRoomClient(this.prismaService.getClient());
    const existing = await client.studioRoom.findFirst({
      where: { id, studioId, ...ACTIVE_STUDIO_ROOM_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`STUDIO_ROOM_NOT_FOUND:${id}`);
    }
    const row = await client.studioRoom.update({ where: { id }, data });
    return toStudioRoom(row);
  }

  async softDelete(id: string, studioId: string): Promise<StudioRoom> {
    const client = asStudioRoomClient(this.prismaService.getClient());
    const existing = await client.studioRoom.findFirst({
      where: { id, studioId, ...ACTIVE_STUDIO_ROOM_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`STUDIO_ROOM_NOT_FOUND:${id}`);
    }
    const row = await client.studioRoom.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    return toStudioRoom(row);
  }
}
