import { Injectable } from "@nestjs/common";
import { SYNC } from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { ProjectBooking, ProjectBookingPayload, ProjectBookingStatus } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asProjectBookingClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_PROJECT_BOOKING_FILTER = { deletedAt: null } as const;

export const OCCUPYING_PROJECT_BOOKING_STATUSES: ProjectBookingStatus[] = [
  "draft",
  "booked",
  "completed",
];

const EMPTY_PAYLOAD: ProjectBookingPayload = {
  engineerId: null,
  sessionId: null,
  attendanceRecorded: false,
  equipmentIds: [],
};

function normalizePayload(raw: unknown): ProjectBookingPayload {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_PAYLOAD };
  }

  const value = raw as Record<string, unknown>;
  return {
    engineerId: typeof value.engineerId === "string" ? value.engineerId : null,
    sessionId: typeof value.sessionId === "string" ? value.sessionId : null,
    attendanceRecorded: Boolean(value.attendanceRecorded),
    equipmentIds: Array.isArray(value.equipmentIds)
      ? (value.equipmentIds as string[])
      : [],
    slotConflict: value.slotConflict === true ? true : undefined,
  };
}

function toProjectBooking(row: {
  id: string;
  studioId: string;
  projectId: string;
  roomStudioId: string;
  clientId: string | null;
  bookingFor: string;
  notes: string;
  date: string;
  slotId: string;
  status: string;
  clientName: string;
  projectName: string;
  projectNumber: string;
  payload: unknown;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ProjectBooking {
  return {
    ...row,
    status: row.status as ProjectBookingStatus,
    payload: normalizePayload(row.payload),
  };
}

@Injectable()
export class ProjectBookingsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private buildSearchFilter(search?: string) {
    if (!search) {
      return {};
    }

    if (this.prismaService.provider === "postgresql") {
      return {
        OR: [
          { projectName: { contains: search, mode: "insensitive" as const } },
          { clientName: { contains: search, mode: "insensitive" as const } },
          { bookingFor: { contains: search, mode: "insensitive" as const } },
        ],
      };
    }

    return {
      OR: [
        { projectName: { contains: search } },
        { clientName: { contains: search } },
        { bookingFor: { contains: search } },
      ],
    };
  }

  async create(data: {
    studioId: string;
    projectId: string;
    roomStudioId: string;
    clientId: string | null;
    bookingFor: string;
    notes: string;
    date: string;
    slotId: string;
    status: ProjectBookingStatus;
    clientName: string;
    projectName: string;
    projectNumber: string;
    payload: ProjectBookingPayload;
  }): Promise<ProjectBooking> {
    const client = asProjectBookingClient(this.prismaService.getClient());
    const row = await client.projectBooking.create({
      data: {
        ...data,
        payload: JSON.parse(JSON.stringify(data.payload)),
      },
    });
    return toProjectBooking(row);
  }

  async findById(id: string, studioId?: string): Promise<ProjectBooking | null> {
    const client = asProjectBookingClient(this.prismaService.getClient());
    const row = await client.projectBooking.findFirst({
      where: {
        id,
        ...(studioId ? { studioId } : {}),
        ...ACTIVE_PROJECT_BOOKING_FILTER,
      },
    });
    return row ? toProjectBooking(row) : null;
  }

  async findMany(params: {
    studioId: string;
    skip: number;
    take: number;
    search?: string;
  }): Promise<ProjectBooking[]> {
    const client = asProjectBookingClient(this.prismaService.getClient());
    const rows = await client.projectBooking.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_PROJECT_BOOKING_FILTER,
        ...this.buildSearchFilter(params.search),
      },
      skip: params.skip,
      take: params.take,
      orderBy: [{ date: "asc" }, { slotId: "asc" }],
    });
    return rows.map(toProjectBooking);
  }

  async count(studioId: string, search?: string): Promise<number> {
    const client = asProjectBookingClient(this.prismaService.getClient());
    return client.projectBooking.count({
      where: {
        studioId,
        ...ACTIVE_PROJECT_BOOKING_FILTER,
        ...this.buildSearchFilter(search),
      },
    });
  }

  async findChangesSince(params: {
    studioId: string;
    since?: Date;
    take?: number;
  }): Promise<ProjectBooking[]> {
    const client = asProjectBookingClient(this.prismaService.getClient());
    const take = params.take ?? SYNC.MAX_PROJECT_BOOKINGS_PULL_BATCH;
    const rows = await client.projectBooking.findMany({
      where: {
        studioId: params.studioId,
        ...(params.since ? { updatedAt: { gt: params.since } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take,
    });
    return rows.map(toProjectBooking);
  }

  async findOccupyingConflict(params: {
    studioId: string;
    roomStudioId: string;
    date: string;
    slotId: string;
    excludeId?: string;
  }): Promise<ProjectBooking | null> {
    const client = asProjectBookingClient(this.prismaService.getClient());
    const row = await client.projectBooking.findFirst({
      where: {
        studioId: params.studioId,
        roomStudioId: params.roomStudioId,
        date: params.date,
        slotId: params.slotId,
        deletedAt: null,
        status: { in: OCCUPYING_PROJECT_BOOKING_STATUSES },
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
    });
    return row ? toProjectBooking(row) : null;
  }

  async update(
    id: string,
    studioId: string,
    data: Partial<{
      projectId: string;
      roomStudioId: string;
      clientId: string | null;
      bookingFor: string;
      notes: string;
      date: string;
      slotId: string;
      status: ProjectBookingStatus;
      clientName: string;
      projectName: string;
      projectNumber: string;
      payload: ProjectBookingPayload;
    }>,
  ): Promise<ProjectBooking> {
    const client = asProjectBookingClient(this.prismaService.getClient());
    const existing = await client.projectBooking.findFirst({
      where: { id, studioId, ...ACTIVE_PROJECT_BOOKING_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`PROJECT_BOOKING_NOT_FOUND:${id}`);
    }
    const row = await client.projectBooking.update({
      where: { id },
      data: {
        ...data,
        ...(data.payload !== undefined
          ? { payload: JSON.parse(JSON.stringify(data.payload)) }
          : {}),
      },
    });
    return toProjectBooking(row);
  }

  async softDelete(id: string, studioId: string): Promise<ProjectBooking> {
    const client = asProjectBookingClient(this.prismaService.getClient());
    const existing = await client.projectBooking.findFirst({
      where: { id, studioId, ...ACTIVE_PROJECT_BOOKING_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`PROJECT_BOOKING_NOT_FOUND:${id}`);
    }
    const row = await client.projectBooking.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    return toProjectBooking(row);
  }
}

export { EMPTY_PAYLOAD, normalizePayload };
