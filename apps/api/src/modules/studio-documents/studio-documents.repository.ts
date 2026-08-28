import { Injectable } from "@nestjs/common";
import { SYNC } from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { StudioDocument, StudioDocumentType } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asStudioDocumentClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_STUDIO_DOCUMENT_FILTER = { deletedAt: null } as const;

function documentPrefix(type: StudioDocumentType): string {
  if (type === "invoice") {
    return "INV";
  }
  if (type === "receipt") {
    return "RCP";
  }
  return "QTN";
}

function parseDocumentNumber(type: StudioDocumentType, value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const prefix = documentPrefix(type);
  const match = value.match(new RegExp(`^${prefix}-(\\d+)$`, "i"));
  return match ? Number.parseInt(match[1], 10) : 0;
}

function formatDocumentNumber(type: StudioDocumentType, n: number): string {
  return `${documentPrefix(type)}-${String(n).padStart(4, "0")}`;
}

function toStudioDocument(row: {
  id: string;
  studioId: string;
  type: string;
  documentNumber: string;
  inquiryId: string | null;
  projectId: string | null;
  paymentId: string | null;
  snapshot: unknown;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): StudioDocument {
  return {
    ...row,
    type: row.type as StudioDocumentType,
    snapshot: row.snapshot ?? null,
  };
}

@Injectable()
export class StudioDocumentsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private buildSearchFilter(search?: string) {
    if (!search) {
      return {};
    }

    if (this.prismaService.provider === "postgresql") {
      return {
        OR: [
          { documentNumber: { contains: search, mode: "insensitive" as const } },
          { type: { contains: search, mode: "insensitive" as const } },
        ],
      };
    }

    return {
      OR: [{ documentNumber: { contains: search } }, { type: { contains: search } }],
    };
  }

  private async nextDocumentNumber(
    tx: { studioDocument: PostgresPrismaClient["studioDocument"] },
    studioId: string,
    type: StudioDocumentType,
  ): Promise<string> {
    const rows = await tx.studioDocument.findMany({
      where: { studioId, type },
      select: { documentNumber: true },
    });
    const max = rows.reduce(
      (acc, row) => Math.max(acc, parseDocumentNumber(type, row.documentNumber)),
      0,
    );
    return formatDocumentNumber(type, max + 1);
  }

  async create(data: {
    studioId: string;
    type: StudioDocumentType;
    inquiryId: string | null;
    projectId: string | null;
    paymentId: string | null;
    snapshot: unknown | null;
  }): Promise<StudioDocument> {
    const client = asStudioDocumentClient(this.prismaService.getClient());
    const row = await client.$transaction(async (tx) => {
      const documentNumber = await this.nextDocumentNumber(tx, data.studioId, data.type);
      return tx.studioDocument.create({
        data: {
          ...data,
          documentNumber,
          ...(data.snapshot !== null && data.snapshot !== undefined
            ? { snapshot: JSON.parse(JSON.stringify(data.snapshot)) }
            : {}),
        },
      });
    });
    return toStudioDocument(row);
  }

  async findById(id: string, studioId?: string): Promise<StudioDocument | null> {
    const client = asStudioDocumentClient(this.prismaService.getClient());
    const row = await client.studioDocument.findFirst({
      where: {
        id,
        ...(studioId ? { studioId } : {}),
        ...ACTIVE_STUDIO_DOCUMENT_FILTER,
      },
    });
    return row ? toStudioDocument(row) : null;
  }

  async findMany(params: {
    studioId: string;
    skip: number;
    take: number;
    search?: string;
  }): Promise<StudioDocument[]> {
    const client = asStudioDocumentClient(this.prismaService.getClient());
    const rows = await client.studioDocument.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_STUDIO_DOCUMENT_FILTER,
        ...this.buildSearchFilter(params.search),
      },
      skip: params.skip,
      take: params.take,
      orderBy: [{ type: "asc" }, { documentNumber: "asc" }],
    });
    return rows.map(toStudioDocument);
  }

  async count(studioId: string, search?: string): Promise<number> {
    const client = asStudioDocumentClient(this.prismaService.getClient());
    return client.studioDocument.count({
      where: {
        studioId,
        ...ACTIVE_STUDIO_DOCUMENT_FILTER,
        ...this.buildSearchFilter(search),
      },
    });
  }

  async findChangesSince(params: {
    studioId: string;
    since?: Date;
    take?: number;
  }): Promise<StudioDocument[]> {
    const client = asStudioDocumentClient(this.prismaService.getClient());
    const take = params.take ?? SYNC.MAX_STUDIO_DOCUMENTS_PULL_BATCH;
    const rows = await client.studioDocument.findMany({
      where: {
        studioId: params.studioId,
        ...(params.since ? { updatedAt: { gt: params.since } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take,
    });
    return rows.map(toStudioDocument);
  }

  async update(
    id: string,
    studioId: string,
    data: Partial<{
      inquiryId: string | null;
      projectId: string | null;
      paymentId: string | null;
      snapshot: unknown | null;
    }>,
  ): Promise<StudioDocument> {
    const client = asStudioDocumentClient(this.prismaService.getClient());
    const existing = await client.studioDocument.findFirst({
      where: { id, studioId, ...ACTIVE_STUDIO_DOCUMENT_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`STUDIO_DOCUMENT_NOT_FOUND:${id}`);
    }
    const row = await client.studioDocument.update({
      where: { id },
      data: {
        ...data,
        ...(data.snapshot !== undefined
          ? {
              snapshot:
                data.snapshot === null
                  ? null
                  : JSON.parse(JSON.stringify(data.snapshot)),
            }
          : {}),
      },
    });
    return toStudioDocument(row);
  }

  async softDelete(id: string, studioId: string): Promise<StudioDocument> {
    const client = asStudioDocumentClient(this.prismaService.getClient());
    const existing = await client.studioDocument.findFirst({
      where: { id, studioId, ...ACTIVE_STUDIO_DOCUMENT_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`STUDIO_DOCUMENT_NOT_FOUND:${id}`);
    }
    const row = await client.studioDocument.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    return toStudioDocument(row);
  }
}

export { documentPrefix, formatDocumentNumber, parseDocumentNumber };
