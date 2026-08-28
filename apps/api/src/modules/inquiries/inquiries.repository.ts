import { Injectable } from "@nestjs/common";
import { SYNC } from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { Inquiry } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asInquiryClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_INQUIRY_FILTER = { deletedAt: null } as const;

function parseInquiryNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const match = value.match(/^INQ-(\d+)$/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function formatInquiryNumber(n: number): string {
  return `INQ-${String(n).padStart(4, "0")}`;
}

function toInquiry(row: {
  id: string;
  studioId: string;
  inquiryNumber: string;
  status: string;
  projectId: string | null;
  advanceAmount: number | null;
  remainingBalance: number | null;
  form: unknown;
  quotation: unknown;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Inquiry {
  return {
    ...row,
    form: row.form ?? {},
    quotation: row.quotation ?? {},
  };
}

@Injectable()
export class InquiriesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private buildSearchFilter(search?: string) {
    if (!search) {
      return {};
    }

    if (this.prismaService.provider === "postgresql") {
      return {
        inquiryNumber: {
          contains: search,
          mode: "insensitive" as const,
        },
      };
    }

    return {
      inquiryNumber: {
        contains: search,
      },
    };
  }

  private async nextInquiryNumber(
    tx: { inquiry: PostgresPrismaClient["inquiry"] },
    studioId: string,
  ): Promise<string> {
    const rows = await tx.inquiry.findMany({
      where: { studioId },
      select: { inquiryNumber: true },
    });
    const max = rows.reduce(
      (acc, row) => Math.max(acc, parseInquiryNumber(row.inquiryNumber)),
      0,
    );
    return formatInquiryNumber(max + 1);
  }

  async create(data: {
    studioId: string;
    status: string;
    projectId: string | null;
    advanceAmount: number | null;
    remainingBalance: number | null;
    form: unknown;
    quotation: unknown;
  }): Promise<Inquiry> {
    const client = asInquiryClient(this.prismaService.getClient());
    const row = await client.$transaction(async (tx) => {
      const inquiryNumber = await this.nextInquiryNumber(tx, data.studioId);
      return tx.inquiry.create({
        data: {
          ...data,
          inquiryNumber,
          form: JSON.parse(JSON.stringify(data.form)),
          quotation: JSON.parse(JSON.stringify(data.quotation)),
        },
      });
    });
    return toInquiry(row);
  }

  async findById(id: string, studioId?: string): Promise<Inquiry | null> {
    const client = asInquiryClient(this.prismaService.getClient());
    const row = await client.inquiry.findFirst({
      where: {
        id,
        ...(studioId ? { studioId } : {}),
        ...ACTIVE_INQUIRY_FILTER,
      },
    });
    return row ? toInquiry(row) : null;
  }

  async findMany(params: {
    studioId: string;
    skip: number;
    take: number;
    search?: string;
  }): Promise<Inquiry[]> {
    const client = asInquiryClient(this.prismaService.getClient());
    const rows = await client.inquiry.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_INQUIRY_FILTER,
        ...this.buildSearchFilter(params.search),
      },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toInquiry);
  }

  async count(studioId: string, search?: string): Promise<number> {
    const client = asInquiryClient(this.prismaService.getClient());
    return client.inquiry.count({
      where: {
        studioId,
        ...ACTIVE_INQUIRY_FILTER,
        ...this.buildSearchFilter(search),
      },
    });
  }

  async findChangesSince(params: {
    studioId: string;
    since?: Date;
    take?: number;
  }): Promise<Inquiry[]> {
    const client = asInquiryClient(this.prismaService.getClient());
    const take = params.take ?? SYNC.MAX_INQUIRIES_PULL_BATCH;
    const rows = await client.inquiry.findMany({
      where: {
        studioId: params.studioId,
        ...(params.since ? { updatedAt: { gt: params.since } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take,
    });
    return rows.map(toInquiry);
  }

  async update(
    id: string,
    studioId: string,
    data: Partial<{
      status: string;
      projectId: string | null;
      advanceAmount: number | null;
      remainingBalance: number | null;
      form: unknown;
      quotation: unknown;
    }>,
  ): Promise<Inquiry> {
    const client = asInquiryClient(this.prismaService.getClient());
    const existing = await client.inquiry.findFirst({
      where: { id, studioId, ...ACTIVE_INQUIRY_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`INQUIRY_NOT_FOUND:${id}`);
    }
    const row = await client.inquiry.update({
      where: { id },
      data: {
        ...data,
        ...(data.form !== undefined ? { form: JSON.parse(JSON.stringify(data.form)) } : {}),
        ...(data.quotation !== undefined
          ? { quotation: JSON.parse(JSON.stringify(data.quotation)) }
          : {}),
      },
    });
    return toInquiry(row);
  }

  async softDelete(id: string, studioId: string): Promise<Inquiry> {
    const client = asInquiryClient(this.prismaService.getClient());
    const existing = await client.inquiry.findFirst({
      where: { id, studioId, ...ACTIVE_INQUIRY_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`INQUIRY_NOT_FOUND:${id}`);
    }
    const row = await client.inquiry.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    return toInquiry(row);
  }
}
