import { Injectable } from "@nestjs/common";
import { SYNC } from "@st-manager/constants";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { Project, ProjectPayload } from "@st-manager/types";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";

function asProjectClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_PROJECT_FILTER = { deletedAt: null } as const;

const EMPTY_PAYLOAD: ProjectPayload = {
  selectedServiceIds: [],
  tasks: [],
  files: [],
  links: [],
  expenses: [],
  sessionIds: [],
  bookingIds: [],
  invoiceIds: [],
};

function parseProjectNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const match = value.match(/^PRJ-(\d+)$/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function formatProjectNumber(n: number): string {
  return `PRJ-${String(n).padStart(4, "0")}`;
}

function normalizePayload(raw: unknown): ProjectPayload {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_PAYLOAD };
  }

  const value = raw as Record<string, unknown>;
  return {
    selectedServiceIds: Array.isArray(value.selectedServiceIds)
      ? (value.selectedServiceIds as string[])
      : [],
    quotation: value.quotation,
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    files: Array.isArray(value.files) ? value.files : [],
    links: Array.isArray(value.links) ? value.links : [],
    expenses: Array.isArray(value.expenses) ? value.expenses : [],
    sessionIds: Array.isArray(value.sessionIds) ? (value.sessionIds as string[]) : [],
    bookingIds: Array.isArray(value.bookingIds) ? (value.bookingIds as string[]) : [],
    invoiceIds: Array.isArray(value.invoiceIds) ? (value.invoiceIds as string[]) : [],
  };
}

function toProject(row: {
  id: string;
  studioId: string;
  projectNumber: string;
  source: string;
  inquiryId: string | null;
  clientId: string | null;
  projectName: string;
  clientName: string;
  clientMobile: string | null;
  clientEmail: string | null;
  projectCategory: string | null;
  status: string;
  assignedEngineer: string;
  planId: string | null;
  advanceReceived: number;
  remainingBalance: number;
  grandTotal: number;
  notes: string | null;
  payload: unknown;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Project {
  return {
    ...row,
    source: row.source as Project["source"],
    payload: normalizePayload(row.payload),
  };
}

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private buildSearchFilter(search?: string) {
    if (!search) {
      return {};
    }

    if (this.prismaService.provider === "postgresql") {
      return {
        OR: [
          {
            projectName: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            clientName: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        ],
      };
    }

    return {
      OR: [{ projectName: { contains: search } }, { clientName: { contains: search } }],
    };
  }

  private async nextProjectNumber(
    tx: { project: PostgresPrismaClient["project"] },
    studioId: string,
  ): Promise<string> {
    const rows = await tx.project.findMany({
      where: { studioId },
      select: { projectNumber: true },
    });
    const max = rows.reduce(
      (acc, row) => Math.max(acc, parseProjectNumber(row.projectNumber)),
      0,
    );
    return formatProjectNumber(max + 1);
  }

  async create(data: {
    studioId: string;
    source: Project["source"];
    inquiryId: string | null;
    clientId: string | null;
    projectName: string;
    clientName: string;
    clientMobile: string | null;
    clientEmail: string | null;
    projectCategory: string | null;
    status: string;
    assignedEngineer: string;
    planId: string | null;
    advanceReceived: number;
    remainingBalance: number;
    grandTotal: number;
    notes: string | null;
    payload: ProjectPayload;
  }): Promise<Project> {
    const client = asProjectClient(this.prismaService.getClient());
    const row = await client.$transaction(async (tx) => {
      const projectNumber = await this.nextProjectNumber(tx, data.studioId);
      return tx.project.create({
        data: {
          ...data,
          projectNumber,
          payload: JSON.parse(JSON.stringify(data.payload)),
        },
      });
    });
    return toProject(row);
  }

  async findById(id: string, studioId?: string): Promise<Project | null> {
    const client = asProjectClient(this.prismaService.getClient());
    const row = await client.project.findFirst({
      where: {
        id,
        ...(studioId ? { studioId } : {}),
        ...ACTIVE_PROJECT_FILTER,
      },
    });
    return row ? toProject(row) : null;
  }

  async findMany(params: {
    studioId: string;
    skip: number;
    take: number;
    search?: string;
  }): Promise<Project[]> {
    const client = asProjectClient(this.prismaService.getClient());
    const rows = await client.project.findMany({
      where: {
        studioId: params.studioId,
        ...ACTIVE_PROJECT_FILTER,
        ...this.buildSearchFilter(params.search),
      },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toProject);
  }

  async count(studioId: string, search?: string): Promise<number> {
    const client = asProjectClient(this.prismaService.getClient());
    return client.project.count({
      where: {
        studioId,
        ...ACTIVE_PROJECT_FILTER,
        ...this.buildSearchFilter(search),
      },
    });
  }

  async findChangesSince(params: {
    studioId: string;
    since?: Date;
    take?: number;
  }): Promise<Project[]> {
    const client = asProjectClient(this.prismaService.getClient());
    const take = params.take ?? SYNC.MAX_PROJECTS_PULL_BATCH;
    const rows = await client.project.findMany({
      where: {
        studioId: params.studioId,
        ...(params.since ? { updatedAt: { gt: params.since } } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take,
    });
    return rows.map(toProject);
  }

  async update(
    id: string,
    studioId: string,
    data: Partial<{
      source: Project["source"];
      inquiryId: string | null;
      clientId: string | null;
      projectName: string;
      clientName: string;
      clientMobile: string | null;
      clientEmail: string | null;
      projectCategory: string | null;
      status: string;
      assignedEngineer: string;
      planId: string | null;
      advanceReceived: number;
      remainingBalance: number;
      grandTotal: number;
      notes: string | null;
      payload: ProjectPayload;
    }>,
  ): Promise<Project> {
    const client = asProjectClient(this.prismaService.getClient());
    const existing = await client.project.findFirst({
      where: { id, studioId, ...ACTIVE_PROJECT_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`PROJECT_NOT_FOUND:${id}`);
    }
    const row = await client.project.update({
      where: { id },
      data: {
        ...data,
        ...(data.payload !== undefined
          ? { payload: JSON.parse(JSON.stringify(data.payload)) }
          : {}),
      },
    });
    return toProject(row);
  }

  async softDelete(id: string, studioId: string): Promise<Project> {
    const client = asProjectClient(this.prismaService.getClient());
    const existing = await client.project.findFirst({
      where: { id, studioId, ...ACTIVE_PROJECT_FILTER },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`PROJECT_NOT_FOUND:${id}`);
    }
    const row = await client.project.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    return toProject(row);
  }
}

export { EMPTY_PAYLOAD, normalizePayload };
