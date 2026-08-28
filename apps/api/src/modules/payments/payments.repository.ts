import { Injectable } from "@nestjs/common";
import { SYNC } from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { Payment, PaymentMethod, PaymentSource, PaymentStatus } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asPaymentClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_PAYMENT_FILTER = { deletedAt: null } as const;

function toPayment(row: {
  id: string;
  studioId: string;
  projectId: string;
  amount: number;
  method: string;
  notes: string;
  receivedBy: string;
  source: string;
  status: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Payment {
  return {
    ...row,
    method: row.method as PaymentMethod,
    source: row.source as PaymentSource,
    status: row.status as PaymentStatus,
  };
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private buildSearchFilter(search?: string) {
    if (!search) {
      return {};
    }

    if (this.prismaService.provider === "postgresql") {
      return {
        OR: [
          { notes: { contains: search, mode: "insensitive" as const } },
          { receivedBy: { contains: search, mode: "insensitive" as const } },
        ],
      };
    }

    return {
      OR: [{ notes: { contains: search } }, { receivedBy: { contains: search } }],
    };
  }

  async create(data: {
    studioId: string;
    projectId: string;
    amount: number;
    method: PaymentMethod;
    notes: string;
    receivedBy: string;
    source: PaymentSource;
    status: PaymentStatus;
  }): Promise<Payment> {
    const client = asPaymentClient(this.prismaService.getClient());
    const row = await client.payment.create({ data });
    return toPayment(row);
  }

  async findById(id: string, studioId?: string): Promise<Payment | null> {
    const client = asPaymentClient(this.prismaService.getClient());
    const row = await client.payment.findFirst({
      where: {
        id,
        ...(studioId ? { studioId } : {}),
        ...ACTIVE_PAYMENT_FILTER,
      },
    });
    return row ? toPayment(row) : null;
  }

  async findMany(params: {
    studioId: string;
    skip: number;
    take: number;
    search?: string;
  }): Promise<Payment[]> {
    const client = asPaymentClient(this.prismaService.getClient());
    const rows = await client.payment.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_PAYMENT_FILTER,
        ...this.buildSearchFilter(params.search),
      },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toPayment);
  }

  async count(studioId: string, search?: string): Promise<number> {
    const client = asPaymentClient(this.prismaService.getClient());
    return client.payment.count({
      where: {
        studioId,
        ...ACTIVE_PAYMENT_FILTER,
        ...this.buildSearchFilter(search),
      },
    });
  }

  async findChangesSince(params: {
    studioId: string;
    since?: Date;
    take?: number;
  }): Promise<Payment[]> {
    const client = asPaymentClient(this.prismaService.getClient());
    const take = params.take ?? SYNC.MAX_PAYMENTS_PULL_BATCH;
    const rows = await client.payment.findMany({
      where: {
        studioId: params.studioId,
        ...(params.since ? { updatedAt: { gt: params.since } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take,
    });
    return rows.map(toPayment);
  }

  async update(
    id: string,
    studioId: string,
    data: Partial<{
      projectId: string;
      amount: number;
      method: PaymentMethod;
      notes: string;
      receivedBy: string;
      source: PaymentSource;
      status: PaymentStatus;
    }>,
  ): Promise<Payment> {
    const client = asPaymentClient(this.prismaService.getClient());
    const existing = await client.payment.findFirst({
      where: { id, studioId, ...ACTIVE_PAYMENT_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`PAYMENT_NOT_FOUND:${id}`);
    }
    const row = await client.payment.update({
      where: { id },
      data,
    });
    return toPayment(row);
  }

  async softDelete(id: string, studioId: string): Promise<Payment> {
    const client = asPaymentClient(this.prismaService.getClient());
    const existing = await client.payment.findFirst({
      where: { id, studioId, ...ACTIVE_PAYMENT_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`PAYMENT_NOT_FOUND:${id}`);
    }
    const row = await client.payment.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    return toPayment(row);
  }
}
