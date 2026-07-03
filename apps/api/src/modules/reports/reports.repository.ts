import { Injectable } from "@nestjs/common";
import type { PostgresPrismaClient } from "@st-manager/database";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asReportsClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

export interface PaidInvoiceRecord {
  id: string;
  clientId: string;
  total: number;
  paidAt: Date;
  number: string;
  clientName: string;
}

export interface CompletedSessionRecord {
  id: string;
  studioId: string;
  clientId: string | null;
  startedAt: Date;
  endedAt: Date;
  studioName: string;
}

export interface BookingActivityRecord {
  id: string;
  clientId: string | null;
}

export interface SessionActivityRecord {
  id: string;
  clientId: string | null;
}

export interface StudioRecord {
  id: string;
  name: string;
}

export interface ClientRecord {
  id: string;
  name: string;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findStudios(): Promise<StudioRecord[]> {
    const client = asReportsClient(this.prismaService.getClient());
    return client.studio.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async findActiveClients(): Promise<ClientRecord[]> {
    const client = asReportsClient(this.prismaService.getClient());
    return client.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async findPaidInvoicesInRange(from: Date, to: Date): Promise<PaidInvoiceRecord[]> {
    const client = asReportsClient(this.prismaService.getClient());
    const invoices = await client.invoice.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: from,
          lt: to,
        },
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { paidAt: "asc" },
    });

    return invoices.map((invoice) => ({
      id: invoice.id,
      clientId: invoice.clientId,
      total: invoice.total,
      paidAt: invoice.paidAt!,
      number: invoice.number,
      clientName: invoice.client.name,
    }));
  }

  async findCompletedSessionsInRange(from: Date, to: Date): Promise<CompletedSessionRecord[]> {
    const client = asReportsClient(this.prismaService.getClient());
    const sessions = await client.session.findMany({
      where: {
        status: "completed",
        endedAt: {
          gte: from,
          lt: to,
        },
      },
      include: {
        studio: { select: { name: true } },
      },
      orderBy: { endedAt: "asc" },
    });

    return sessions
      .filter((session): session is typeof session & { endedAt: Date } => session.endedAt !== null)
      .map((session) => ({
        id: session.id,
        studioId: session.studioId,
        clientId: session.clientId,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        studioName: session.studio.name,
      }));
  }

  async findBookingsInRange(from: Date, to: Date): Promise<BookingActivityRecord[]> {
    const client = asReportsClient(this.prismaService.getClient());
    return client.booking.findMany({
      where: {
        status: "confirmed",
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: {
        id: true,
        clientId: true,
      },
    });
  }

  async findSessionsInRange(from: Date, to: Date): Promise<SessionActivityRecord[]> {
    const client = asReportsClient(this.prismaService.getClient());
    return client.session.findMany({
      where: {
        status: { not: "cancelled" },
        startedAt: {
          gte: from,
          lt: to,
        },
      },
      select: {
        id: true,
        clientId: true,
      },
    });
  }
}
