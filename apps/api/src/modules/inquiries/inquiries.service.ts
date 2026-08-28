import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PLATFORM_ROLES, SYNC } from "@st-manager/constants";
import type { PaginationMetaDto } from "@st-manager/contracts";
import type { Inquiry } from "@st-manager/types";
import type {
  CreateInquiryInput,
  ListInquiriesQueryInput,
  SyncInquiriesPullQueryInput,
  UpdateInquiryInput,
} from "@st-manager/validation";

import { AuthRepository } from "../auth/auth.repository";
import type { AuthenticatedUser } from "../auth/auth.types";
import { InquiriesRepository } from "./inquiries.repository";

@Injectable()
export class InquiriesService {
  constructor(
    private readonly inquiriesRepository: InquiriesRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async create(actor: AuthenticatedUser, input: CreateInquiryInput): Promise<Inquiry> {
    const studioId = await this.requireStudioId(actor);

    return this.inquiriesRepository.create({
      studioId,
      status: input.status ?? "inquiry",
      projectId: input.projectId ?? null,
      advanceAmount: input.advanceAmount ?? null,
      remainingBalance: input.remainingBalance ?? null,
      form: input.form,
      quotation: input.quotation,
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: ListInquiriesQueryInput,
  ): Promise<{ data: Inquiry[]; meta: PaginationMetaDto }> {
    const studioId = await this.requireStudioId(actor);
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.inquiriesRepository.findMany({ studioId, skip, take: pageSize, search }),
      this.inquiriesRepository.count(studioId, search),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  async pullChanges(
    actor: AuthenticatedUser,
    query: SyncInquiriesPullQueryInput,
  ): Promise<{ data: Inquiry[]; serverTime: string; hasMore: boolean }> {
    const studioId = await this.requireStudioId(actor);
    const serverNow = new Date();
    let since = query.since ? new Date(query.since) : undefined;
    if (since && Number.isNaN(since.getTime())) {
      since = undefined;
    }
    if (since && since.getTime() > serverNow.getTime()) {
      since = undefined;
    }

    const take = SYNC.MAX_INQUIRIES_PULL_BATCH;
    const rows = await this.inquiriesRepository.findChangesSince({
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

  async getById(actor: AuthenticatedUser, id: string): Promise<Inquiry> {
    const studioId = await this.requireStudioId(actor);
    const inquiry = await this.inquiriesRepository.findById(id, studioId);
    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${id} not found`);
    }
    return inquiry;
  }

  async update(actor: AuthenticatedUser, id: string, input: UpdateInquiryInput): Promise<Inquiry> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.inquiriesRepository.findById(id, studioId);
    if (!existing) {
      throw new NotFoundException(`Inquiry ${id} not found`);
    }

    const updateData: Parameters<InquiriesRepository["update"]>[2] = {};

    if (input.status !== undefined) updateData.status = input.status;
    if (input.projectId !== undefined) updateData.projectId = input.projectId;
    if (input.advanceAmount !== undefined) updateData.advanceAmount = input.advanceAmount;
    if (input.remainingBalance !== undefined) updateData.remainingBalance = input.remainingBalance;
    if (input.form !== undefined) updateData.form = input.form;
    if (input.quotation !== undefined) updateData.quotation = input.quotation;

    try {
      return await this.inquiriesRepository.update(id, studioId, updateData);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("INQUIRY_NOT_FOUND:")) {
        throw new NotFoundException(`Inquiry ${id} not found`);
      }
      throw error;
    }
  }

  async softDelete(actor: AuthenticatedUser, id: string): Promise<void> {
    const studioId = await this.requireStudioId(actor);
    try {
      await this.inquiriesRepository.softDelete(id, studioId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("INQUIRY_NOT_FOUND:")) {
        throw new NotFoundException(`Inquiry ${id} not found`);
      }
      throw error;
    }
  }

  async requireStudioId(actor: AuthenticatedUser): Promise<string> {
    if (actor.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new ForbiddenException("Platform admin cannot access studio inquiries");
    }

    const user = await this.authRepository.findById(actor.userId);
    if (!user?.studioId) {
      throw new UnauthorizedException("Studio context required");
    }
    return user.studioId;
  }
}
