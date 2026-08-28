import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PLATFORM_ROLES, SYNC } from "@st-manager/constants";
import type { PaginationMetaDto } from "@st-manager/contracts";
import type { Payment } from "@st-manager/types";
import type {
  CreatePaymentInput,
  ListPaymentsQueryInput,
  SyncPaymentsPullQueryInput,
  UpdatePaymentInput,
} from "@st-manager/validation";

import { AuthRepository } from "../auth/auth.repository";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ProjectsRepository } from "../projects/projects.repository";
import { PaymentsRepository } from "./payments.repository";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async create(actor: AuthenticatedUser, input: CreatePaymentInput): Promise<Payment> {
    const studioId = await this.requireStudioId(actor);
    await this.assertProjectInStudio(input.projectId, studioId);

    return this.paymentsRepository.create({
      studioId,
      projectId: input.projectId,
      amount: input.amount,
      method: input.method,
      notes: input.notes ?? "",
      receivedBy: input.receivedBy ?? "",
      source: input.source ?? "manual",
      status: input.status ?? "received",
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: ListPaymentsQueryInput,
  ): Promise<{ data: Payment[]; meta: PaginationMetaDto }> {
    const studioId = await this.requireStudioId(actor);
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.paymentsRepository.findMany({ studioId, skip, take: pageSize, search }),
      this.paymentsRepository.count(studioId, search),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  async pullChanges(
    actor: AuthenticatedUser,
    query: SyncPaymentsPullQueryInput,
  ): Promise<{ data: Payment[]; serverTime: string; hasMore: boolean }> {
    const studioId = await this.requireStudioId(actor);
    const serverNow = new Date();
    let since = query.since ? new Date(query.since) : undefined;
    if (since && Number.isNaN(since.getTime())) {
      since = undefined;
    }
    if (since && since.getTime() > serverNow.getTime()) {
      since = undefined;
    }

    const take = SYNC.MAX_PAYMENTS_PULL_BATCH;
    const rows = await this.paymentsRepository.findChangesSince({
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

  async getById(actor: AuthenticatedUser, id: string): Promise<Payment> {
    const studioId = await this.requireStudioId(actor);
    const payment = await this.paymentsRepository.findById(id, studioId);
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }
    return payment;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdatePaymentInput,
  ): Promise<Payment> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.paymentsRepository.findById(id, studioId);
    if (!existing) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    if (input.projectId !== undefined) {
      await this.assertProjectInStudio(input.projectId, studioId);
    }

    const updateData: Parameters<PaymentsRepository["update"]>[2] = {};
    if (input.projectId !== undefined) updateData.projectId = input.projectId;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.method !== undefined) updateData.method = input.method;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.receivedBy !== undefined) updateData.receivedBy = input.receivedBy;
    if (input.source !== undefined) updateData.source = input.source;
    if (input.status !== undefined) updateData.status = input.status;

    try {
      return await this.paymentsRepository.update(id, studioId, updateData);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("PAYMENT_NOT_FOUND:")) {
        throw new NotFoundException(`Payment ${id} not found`);
      }
      throw error;
    }
  }

  async softDelete(actor: AuthenticatedUser, id: string): Promise<void> {
    const studioId = await this.requireStudioId(actor);
    try {
      await this.paymentsRepository.softDelete(id, studioId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("PAYMENT_NOT_FOUND:")) {
        throw new NotFoundException(`Payment ${id} not found`);
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
      throw new ForbiddenException("Platform admin cannot access studio payments");
    }

    const user = await this.authRepository.findById(actor.userId);
    if (!user?.studioId) {
      throw new UnauthorizedException("Studio context required");
    }
    return user.studioId;
  }
}
