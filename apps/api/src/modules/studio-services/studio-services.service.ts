import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PLATFORM_ROLES, SYNC } from "@st-manager/constants";
import type { PaginationMetaDto } from "@st-manager/contracts";
import type { StudioService } from "@st-manager/types";
import type {
  CreateStudioServiceInput,
  ListStudioServicesQueryInput,
  SyncStudioServicesPullQueryInput,
  UpdateStudioServiceInput,
} from "@st-manager/validation";

import { AuthRepository } from "../auth/auth.repository";
import type { AuthenticatedUser } from "../auth/auth.types";
import { StudioServicesRepository } from "./studio-services.repository";

@Injectable()
export class StudioServicesService {
  constructor(
    private readonly studioServicesRepository: StudioServicesRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async create(actor: AuthenticatedUser, input: CreateStudioServiceInput): Promise<StudioService> {
    const studioId = await this.requireStudioId(actor);

    return this.studioServicesRepository.create({
      studioId,
      name: input.name,
      category: input.category ?? "",
      description: input.description ?? "",
      active: input.active ?? true,
      mandatory: input.mandatory ?? false,
      isStudioRent: input.isStudioRent ?? false,
      sortOrder: input.sortOrder ?? 0,
      legacyPrice: input.legacyPrice ?? 0,
      prices: input.prices,
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: ListStudioServicesQueryInput,
  ): Promise<{ data: StudioService[]; meta: PaginationMetaDto }> {
    const studioId = await this.requireStudioId(actor);
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.studioServicesRepository.findMany({ studioId, skip, take: pageSize, search }),
      this.studioServicesRepository.count(studioId, search),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  async pullChanges(
    actor: AuthenticatedUser,
    query: SyncStudioServicesPullQueryInput,
  ): Promise<{ data: StudioService[]; serverTime: string; hasMore: boolean }> {
    const studioId = await this.requireStudioId(actor);
    const serverNow = new Date();
    let since = query.since ? new Date(query.since) : undefined;
    if (since && Number.isNaN(since.getTime())) {
      since = undefined;
    }
    if (since && since.getTime() > serverNow.getTime()) {
      since = undefined;
    }

    const take = SYNC.MAX_STUDIO_SERVICES_PULL_BATCH;
    const rows = await this.studioServicesRepository.findChangesSince({
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

    return { data: page, serverTime, hasMore };
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<StudioService> {
    const studioId = await this.requireStudioId(actor);
    const service = await this.studioServicesRepository.findById(id, studioId);
    if (!service) {
      throw new NotFoundException(`Studio service ${id} not found`);
    }
    return service;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateStudioServiceInput,
  ): Promise<StudioService> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.studioServicesRepository.findById(id, studioId);
    if (!existing) {
      throw new NotFoundException(`Studio service ${id} not found`);
    }

    const updateData: Parameters<StudioServicesRepository["update"]>[2] = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.active !== undefined) updateData.active = input.active;
    if (input.mandatory !== undefined) updateData.mandatory = input.mandatory;
    if (input.isStudioRent !== undefined) updateData.isStudioRent = input.isStudioRent;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
    if (input.legacyPrice !== undefined) updateData.legacyPrice = input.legacyPrice;
    if (input.prices !== undefined) updateData.prices = input.prices;

    try {
      return await this.studioServicesRepository.update(id, studioId, updateData);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("STUDIO_SERVICE_NOT_FOUND:")) {
        throw new NotFoundException(`Studio service ${id} not found`);
      }
      throw error;
    }
  }

  async softDelete(actor: AuthenticatedUser, id: string): Promise<void> {
    const studioId = await this.requireStudioId(actor);
    try {
      await this.studioServicesRepository.softDelete(id, studioId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("STUDIO_SERVICE_NOT_FOUND:")) {
        throw new NotFoundException(`Studio service ${id} not found`);
      }
      throw error;
    }
  }

  async requireStudioId(actor: AuthenticatedUser): Promise<string> {
    if (actor.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new ForbiddenException("Platform admin cannot access studio services");
    }

    const user = await this.authRepository.findById(actor.userId);
    if (!user?.studioId) {
      throw new UnauthorizedException("Studio context required");
    }
    return user.studioId;
  }
}
