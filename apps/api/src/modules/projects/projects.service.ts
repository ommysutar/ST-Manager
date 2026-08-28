import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PLATFORM_ROLES, SYNC } from "@st-manager/constants";
import type { PaginationMetaDto } from "@st-manager/contracts";
import type { Project, ProjectPayload } from "@st-manager/types";
import type {
  CreateProjectInput,
  ListProjectsQueryInput,
  SyncProjectsPullQueryInput,
  UpdateProjectInput,
} from "@st-manager/validation";

import { AuthRepository } from "../auth/auth.repository";
import type { AuthenticatedUser } from "../auth/auth.types";
import { normalizePayload, ProjectsRepository } from "./projects.repository";

function buildPayloadFromInput(input: {
  selectedServiceIds?: string[];
  quotation?: unknown;
  tasks?: unknown[];
  files?: unknown[];
  links?: unknown[];
  expenses?: unknown[];
  sessionIds?: string[];
  bookingIds?: string[];
  invoiceIds?: string[];
}): ProjectPayload {
  return {
    selectedServiceIds: input.selectedServiceIds ?? [],
    quotation: input.quotation,
    tasks: input.tasks ?? [],
    files: input.files ?? [],
    links: input.links ?? [],
    expenses: input.expenses ?? [],
    sessionIds: input.sessionIds ?? [],
    bookingIds: input.bookingIds ?? [],
    invoiceIds: input.invoiceIds ?? [],
  };
}

function mergePayload(existing: ProjectPayload, input: UpdateProjectInput): ProjectPayload {
  return {
    selectedServiceIds:
      input.selectedServiceIds !== undefined
        ? input.selectedServiceIds
        : existing.selectedServiceIds,
    quotation: input.quotation !== undefined ? input.quotation : existing.quotation,
    tasks: input.tasks !== undefined ? input.tasks : existing.tasks,
    files: input.files !== undefined ? input.files : existing.files,
    links: input.links !== undefined ? input.links : existing.links,
    expenses: input.expenses !== undefined ? input.expenses : existing.expenses,
    sessionIds: input.sessionIds !== undefined ? input.sessionIds : existing.sessionIds,
    bookingIds: input.bookingIds !== undefined ? input.bookingIds : existing.bookingIds,
    invoiceIds: input.invoiceIds !== undefined ? input.invoiceIds : existing.invoiceIds,
  };
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async create(actor: AuthenticatedUser, input: CreateProjectInput): Promise<Project> {
    const studioId = await this.requireStudioId(actor);

    return this.projectsRepository.create({
      studioId,
      source: input.source,
      inquiryId: input.inquiryId ?? null,
      clientId: input.clientId ?? null,
      projectName: input.projectName,
      clientName: input.clientName,
      clientMobile: input.clientMobile ?? null,
      clientEmail: input.clientEmail ?? null,
      projectCategory: input.projectCategory ?? null,
      status: input.status ?? "active",
      assignedEngineer: input.assignedEngineer ?? "",
      planId: input.planId ?? null,
      advanceReceived: input.advanceReceived ?? 0,
      remainingBalance: input.remainingBalance ?? 0,
      grandTotal: input.grandTotal ?? 0,
      notes: input.notes ?? null,
      payload: buildPayloadFromInput(input),
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: ListProjectsQueryInput,
  ): Promise<{ data: Project[]; meta: PaginationMetaDto }> {
    const studioId = await this.requireStudioId(actor);
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.projectsRepository.findMany({ studioId, skip, take: pageSize, search }),
      this.projectsRepository.count(studioId, search),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  async pullChanges(
    actor: AuthenticatedUser,
    query: SyncProjectsPullQueryInput,
  ): Promise<{ data: Project[]; serverTime: string; hasMore: boolean }> {
    const studioId = await this.requireStudioId(actor);
    const serverNow = new Date();
    let since = query.since ? new Date(query.since) : undefined;
    if (since && Number.isNaN(since.getTime())) {
      since = undefined;
    }
    if (since && since.getTime() > serverNow.getTime()) {
      since = undefined;
    }

    const take = SYNC.MAX_PROJECTS_PULL_BATCH;
    const rows = await this.projectsRepository.findChangesSince({
      studioId,
      since,
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const lastUpdatedAt = page.at(-1)?.updatedAt;
    const serverTime = lastUpdatedAt
      ? lastUpdatedAt.toISOString()
      : since && since.getTime() <= serverNow.getTime()
        ? since.toISOString()
        : serverNow.toISOString();

    return {
      data: page,
      serverTime,
      hasMore,
    };
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<Project> {
    const studioId = await this.requireStudioId(actor);
    const project = await this.projectsRepository.findById(id, studioId);
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async update(actor: AuthenticatedUser, id: string, input: UpdateProjectInput): Promise<Project> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.projectsRepository.findById(id, studioId);
    if (!existing) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    const updateData: Parameters<ProjectsRepository["update"]>[2] = {};
    const payloadFieldsProvided =
      input.selectedServiceIds !== undefined ||
      input.quotation !== undefined ||
      input.tasks !== undefined ||
      input.files !== undefined ||
      input.links !== undefined ||
      input.expenses !== undefined ||
      input.sessionIds !== undefined ||
      input.bookingIds !== undefined ||
      input.invoiceIds !== undefined;

    if (input.source !== undefined) updateData.source = input.source;
    if (input.inquiryId !== undefined) updateData.inquiryId = input.inquiryId;
    if (input.clientId !== undefined) updateData.clientId = input.clientId;
    if (input.projectName !== undefined) updateData.projectName = input.projectName;
    if (input.clientName !== undefined) updateData.clientName = input.clientName;
    if (input.clientMobile !== undefined) updateData.clientMobile = input.clientMobile;
    if (input.clientEmail !== undefined) updateData.clientEmail = input.clientEmail;
    if (input.projectCategory !== undefined) updateData.projectCategory = input.projectCategory;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.assignedEngineer !== undefined) updateData.assignedEngineer = input.assignedEngineer;
    if (input.planId !== undefined) updateData.planId = input.planId;
    if (input.advanceReceived !== undefined) updateData.advanceReceived = input.advanceReceived;
    if (input.remainingBalance !== undefined) updateData.remainingBalance = input.remainingBalance;
    if (input.grandTotal !== undefined) updateData.grandTotal = input.grandTotal;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (payloadFieldsProvided) {
      updateData.payload = mergePayload(normalizePayload(existing.payload), input);
    }

    try {
      return await this.projectsRepository.update(id, studioId, updateData);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("PROJECT_NOT_FOUND:")) {
        throw new NotFoundException(`Project ${id} not found`);
      }
      throw error;
    }
  }

  async softDelete(actor: AuthenticatedUser, id: string): Promise<void> {
    const studioId = await this.requireStudioId(actor);
    try {
      await this.projectsRepository.softDelete(id, studioId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("PROJECT_NOT_FOUND:")) {
        throw new NotFoundException(`Project ${id} not found`);
      }
      throw error;
    }
  }

  async requireStudioId(actor: AuthenticatedUser): Promise<string> {
    if (actor.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new ForbiddenException("Platform admin cannot access studio projects");
    }

    const user = await this.authRepository.findById(actor.userId);
    if (!user?.studioId) {
      throw new UnauthorizedException("Studio context required");
    }
    return user.studioId;
  }
}

export { buildPayloadFromInput, mergePayload };
