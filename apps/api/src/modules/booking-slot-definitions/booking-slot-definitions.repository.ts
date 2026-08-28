import { Injectable } from "@nestjs/common";
import { SYNC } from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { BookingSlotDefinition } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asBookingSlotDefinitionClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_BOOKING_SLOT_DEFINITION_FILTER = { deletedAt: null } as const;

function toBookingSlotDefinition(row: {
  id: string;
  studioId: string;
  label: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isCustom: boolean;
  sortOrder: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): BookingSlotDefinition {
  return row;
}

@Injectable()
export class BookingSlotDefinitionsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private buildSearchFilter(search?: string) {
    if (!search) {
      return {};
    }

    if (this.prismaService.provider === "postgresql") {
      return {
        label: { contains: search, mode: "insensitive" as const },
      };
    }

    return {
      label: { contains: search },
    };
  }

  async create(data: {
    studioId: string;
    label: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    isCustom: boolean;
    sortOrder: number;
  }): Promise<BookingSlotDefinition> {
    const client = asBookingSlotDefinitionClient(this.prismaService.getClient());
    const row = await client.bookingSlotDefinition.create({ data });
    return toBookingSlotDefinition(row);
  }

  async findById(id: string, studioId?: string): Promise<BookingSlotDefinition | null> {
    const client = asBookingSlotDefinitionClient(this.prismaService.getClient());
    const row = await client.bookingSlotDefinition.findFirst({
      where: {
        id,
        ...(studioId ? { studioId } : {}),
        ...ACTIVE_BOOKING_SLOT_DEFINITION_FILTER,
      },
    });
    return row ? toBookingSlotDefinition(row) : null;
  }

  async findMany(params: {
    studioId: string;
    skip: number;
    take: number;
    search?: string;
  }): Promise<BookingSlotDefinition[]> {
    const client = asBookingSlotDefinitionClient(this.prismaService.getClient());
    const rows = await client.bookingSlotDefinition.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_BOOKING_SLOT_DEFINITION_FILTER,
        ...this.buildSearchFilter(params.search),
      },
      skip: params.skip,
      take: params.take,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows.map(toBookingSlotDefinition);
  }

  async count(studioId: string, search?: string): Promise<number> {
    const client = asBookingSlotDefinitionClient(this.prismaService.getClient());
    return client.bookingSlotDefinition.count({
      where: {
        studioId,
        ...ACTIVE_BOOKING_SLOT_DEFINITION_FILTER,
        ...this.buildSearchFilter(search),
      },
    });
  }

  async findChangesSince(params: {
    studioId: string;
    since?: Date;
    take?: number;
  }): Promise<BookingSlotDefinition[]> {
    const client = asBookingSlotDefinitionClient(this.prismaService.getClient());
    const take = params.take ?? SYNC.MAX_BOOKING_SLOT_DEFINITIONS_PULL_BATCH;
    const rows = await client.bookingSlotDefinition.findMany({
      where: {
        studioId: params.studioId,
        ...(params.since ? { updatedAt: { gt: params.since } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take,
    });
    return rows.map(toBookingSlotDefinition);
  }

  async update(
    id: string,
    studioId: string,
    data: Partial<{
      label: string;
      startHour: number;
      startMinute: number;
      endHour: number;
      endMinute: number;
      isCustom: boolean;
      sortOrder: number;
    }>,
  ): Promise<BookingSlotDefinition> {
    const client = asBookingSlotDefinitionClient(this.prismaService.getClient());
    const existing = await client.bookingSlotDefinition.findFirst({
      where: { id, studioId, ...ACTIVE_BOOKING_SLOT_DEFINITION_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`BOOKING_SLOT_DEFINITION_NOT_FOUND:${id}`);
    }
    const row = await client.bookingSlotDefinition.update({ where: { id }, data });
    return toBookingSlotDefinition(row);
  }

  async softDelete(id: string, studioId: string): Promise<BookingSlotDefinition> {
    const client = asBookingSlotDefinitionClient(this.prismaService.getClient());
    const existing = await client.bookingSlotDefinition.findFirst({
      where: { id, studioId, ...ACTIVE_BOOKING_SLOT_DEFINITION_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`BOOKING_SLOT_DEFINITION_NOT_FOUND:${id}`);
    }
    const row = await client.bookingSlotDefinition.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    return toBookingSlotDefinition(row);
  }
}
