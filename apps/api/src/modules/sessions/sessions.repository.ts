import { Injectable } from "@nestjs/common";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { Session, SessionWithRelations } from "@st-manager/types";
import type { ListSessionsQueryInput } from "@st-manager/validation";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asSessionClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_SESSION_FILTER = { status: { not: "cancelled" } } as const;

const sessionInclude = {
  studio: { select: { name: true } },
  client: { select: { name: true } },
  booking: { select: { title: true } },
} as const;

function mapSession(record: {
  id: string;
  studioId: string;
  clientId: string | null;
  bookingId: string | null;
  title: string;
  startedAt: Date;
  endedAt: Date | null;
  status: string;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  studio: { name: string };
  client: { name: string } | null;
  booking: { title: string } | null;
}): SessionWithRelations {
  return {
    id: record.id,
    studioId: record.studioId,
    clientId: record.clientId,
    bookingId: record.bookingId,
    title: record.title,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    status: record.status as Session["status"],
    notes: record.notes,
    deletedAt: record.deletedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    studioName: record.studio.name,
    clientName: record.client?.name ?? null,
    bookingTitle: record.booking?.title ?? null,
  };
}

@Injectable()
export class SessionsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: {
    studioId: string;
    clientId: string | null;
    bookingId: string | null;
    title: string;
    startedAt: Date;
    notes: string | null;
  }): Promise<SessionWithRelations> {
    const client = asSessionClient(this.prismaService.getClient());
    const session = await client.session.create({
      data: {
        ...data,
        status: "scheduled",
      },
      include: sessionInclude,
    });

    return mapSession(session);
  }

  async findById(id: string): Promise<SessionWithRelations | null> {
    const client = asSessionClient(this.prismaService.getClient());
    const session = await client.session.findFirst({
      where: { id, ...ACTIVE_SESSION_FILTER },
      include: sessionInclude,
    });

    return session ? mapSession(session) : null;
  }

  async findByBookingId(bookingId: string): Promise<SessionWithRelations | null> {
    const client = asSessionClient(this.prismaService.getClient());
    const session = await client.session.findFirst({
      where: { bookingId, ...ACTIVE_SESSION_FILTER },
      include: sessionInclude,
    });

    return session ? mapSession(session) : null;
  }

  async findAnyByBookingId(bookingId: string): Promise<SessionWithRelations | null> {
    const client = asSessionClient(this.prismaService.getClient());
    const session = await client.session.findFirst({
      where: { bookingId },
      include: sessionInclude,
    });

    return session ? mapSession(session) : null;
  }

  async releaseBookingLink(id: string): Promise<void> {
    const client = asSessionClient(this.prismaService.getClient());
    await client.session.update({
      where: { id },
      data: { bookingId: null },
    });
  }

  async findMany(query: ListSessionsQueryInput): Promise<{
    items: SessionWithRelations[];
    total: number;
  }> {
    const client = asSessionClient(this.prismaService.getClient());
    const skip = (query.page - 1) * query.pageSize;
    const where = {
      ...ACTIVE_SESSION_FILTER,
      ...(query.studioId ? { studioId: query.studioId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.bookingId ? { bookingId: query.bookingId } : {}),
      ...(query.from || query.to
        ? {
            startedAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [sessions, total] = await Promise.all([
      client.session.findMany({
        where,
        include: sessionInclude,
        orderBy: { startedAt: "desc" },
        skip,
        take: query.pageSize,
      }),
      client.session.count({ where }),
    ]);

    return {
      items: sessions.map(mapSession),
      total,
    };
  }

  async findInProgress(): Promise<SessionWithRelations[]> {
    const client = asSessionClient(this.prismaService.getClient());
    const sessions = await client.session.findMany({
      where: { status: "in_progress" },
      include: sessionInclude,
      orderBy: { startedAt: "asc" },
    });

    return sessions.map(mapSession);
  }

  async findCompletedToday(): Promise<SessionWithRelations[]> {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const client = asSessionClient(this.prismaService.getClient());
    const sessions = await client.session.findMany({
      where: {
        status: "completed",
        endedAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: sessionInclude,
      orderBy: { endedAt: "desc" },
    });

    return sessions.map(mapSession);
  }

  async update(
    id: string,
    data: Partial<{
      studioId: string;
      clientId: string | null;
      title: string;
      startedAt: Date;
      notes: string | null;
    }>,
  ): Promise<SessionWithRelations> {
    const client = asSessionClient(this.prismaService.getClient());
    const session = await client.session.update({
      where: { id },
      data,
      include: sessionInclude,
    });

    return mapSession(session);
  }

  async start(id: string, startedAt: Date): Promise<SessionWithRelations> {
    const client = asSessionClient(this.prismaService.getClient());
    const session = await client.session.update({
      where: { id },
      data: {
        status: "in_progress",
        startedAt,
      },
      include: sessionInclude,
    });

    return mapSession(session);
  }

  async complete(id: string, endedAt: Date): Promise<SessionWithRelations> {
    const client = asSessionClient(this.prismaService.getClient());
    const session = await client.session.update({
      where: { id },
      data: {
        status: "completed",
        endedAt,
      },
      include: sessionInclude,
    });

    return mapSession(session);
  }

  async cancel(id: string): Promise<SessionWithRelations> {
    const client = asSessionClient(this.prismaService.getClient());
    const session = await client.session.update({
      where: { id },
      data: {
        status: "cancelled",
        bookingId: null,
      },
      include: sessionInclude,
    });

    return mapSession(session);
  }
}
