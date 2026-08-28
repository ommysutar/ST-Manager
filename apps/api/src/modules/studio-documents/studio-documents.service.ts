import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PLATFORM_ROLES, SYNC } from "@st-manager/constants";
import type { PaginationMetaDto } from "@st-manager/contracts";
import type { StudioDocument } from "@st-manager/types";
import type {
  CreateStudioDocumentInput,
  ListStudioDocumentsQueryInput,
  SyncStudioDocumentsPullQueryInput,
  UpdateStudioDocumentInput,
} from "@st-manager/validation";

import { AuthRepository } from "../auth/auth.repository";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ProjectsRepository } from "../projects/projects.repository";
import { StudioDocumentsRepository } from "./studio-documents.repository";

@Injectable()
export class StudioDocumentsService {
  constructor(
    private readonly studioDocumentsRepository: StudioDocumentsRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async create(
    actor: AuthenticatedUser,
    input: CreateStudioDocumentInput,
  ): Promise<StudioDocument> {
    const studioId = await this.requireStudioId(actor);

    if (input.projectId) {
      await this.assertProjectInStudio(input.projectId, studioId);
    }

    return this.studioDocumentsRepository.create({
      studioId,
      type: input.type,
      inquiryId: input.inquiryId ?? null,
      projectId: input.projectId ?? null,
      paymentId: input.paymentId ?? null,
      snapshot: input.snapshot ?? null,
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: ListStudioDocumentsQueryInput,
  ): Promise<{ data: StudioDocument[]; meta: PaginationMetaDto }> {
    const studioId = await this.requireStudioId(actor);
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.studioDocumentsRepository.findMany({ studioId, skip, take: pageSize, search }),
      this.studioDocumentsRepository.count(studioId, search),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  async pullChanges(
    actor: AuthenticatedUser,
    query: SyncStudioDocumentsPullQueryInput,
  ): Promise<{ data: StudioDocument[]; serverTime: string; hasMore: boolean }> {
    const studioId = await this.requireStudioId(actor);
    const serverNow = new Date();
    let since = query.since ? new Date(query.since) : undefined;
    if (since && Number.isNaN(since.getTime())) {
      since = undefined;
    }
    if (since && since.getTime() > serverNow.getTime()) {
      since = undefined;
    }

    const take = SYNC.MAX_STUDIO_DOCUMENTS_PULL_BATCH;
    const rows = await this.studioDocumentsRepository.findChangesSince({
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

  async getById(actor: AuthenticatedUser, id: string): Promise<StudioDocument> {
    const studioId = await this.requireStudioId(actor);
    const document = await this.studioDocumentsRepository.findById(id, studioId);
    if (!document) {
      throw new NotFoundException(`Studio document ${id} not found`);
    }
    return document;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateStudioDocumentInput,
  ): Promise<StudioDocument> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.studioDocumentsRepository.findById(id, studioId);
    if (!existing) {
      throw new NotFoundException(`Studio document ${id} not found`);
    }

    if (input.projectId) {
      await this.assertProjectInStudio(input.projectId, studioId);
    }

    const updateData: Parameters<StudioDocumentsRepository["update"]>[2] = {};
    if (input.inquiryId !== undefined) updateData.inquiryId = input.inquiryId;
    if (input.projectId !== undefined) updateData.projectId = input.projectId;
    if (input.paymentId !== undefined) updateData.paymentId = input.paymentId;
    if (input.snapshot !== undefined) updateData.snapshot = input.snapshot;

    try {
      return await this.studioDocumentsRepository.update(id, studioId, updateData);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("STUDIO_DOCUMENT_NOT_FOUND:")) {
        throw new NotFoundException(`Studio document ${id} not found`);
      }
      throw error;
    }
  }

  async softDelete(actor: AuthenticatedUser, id: string): Promise<void> {
    const studioId = await this.requireStudioId(actor);
    try {
      await this.studioDocumentsRepository.softDelete(id, studioId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("STUDIO_DOCUMENT_NOT_FOUND:")) {
        throw new NotFoundException(`Studio document ${id} not found`);
      }
      throw error;
    }
  }

  private async assertProjectInStudio(projectId: string, studioId: string): Promise<void> {
    const project = await this.projectsRepository.findById(projectId, studioId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  async requireStudioId(actor: AuthenticatedUser): Promise<string> {
    if (actor.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new ForbiddenException("Platform admin cannot access studio documents");
    }

    const user = await this.authRepository.findById(actor.userId);
    if (!user?.studioId) {
      throw new UnauthorizedException("Studio context required");
    }
    return user.studioId;
  }
}
