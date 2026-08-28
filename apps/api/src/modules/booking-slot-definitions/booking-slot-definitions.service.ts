import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PLATFORM_ROLES, SYNC } from "@st-manager/constants";
import type { PaginationMetaDto } from "@st-manager/contracts";
import type { BookingSlotDefinition } from "@st-manager/types";
import type {
  CreateBookingSlotDefinitionInput,
  ListBookingSlotDefinitionsQueryInput,
  SyncBookingSlotDefinitionsPullQueryInput,
  UpdateBookingSlotDefinitionInput,
} from "@st-manager/validation";

import { AuthRepository } from "../auth/auth.repository";
import type { AuthenticatedUser } from "../auth/auth.types";
import { BookingSlotDefinitionsRepository } from "./booking-slot-definitions.repository";

@Injectable()
export class BookingSlotDefinitionsService {
  constructor(
    private readonly bookingSlotDefinitionsRepository: BookingSlotDefinitionsRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async create(
    actor: AuthenticatedUser,
    input: CreateBookingSlotDefinitionInput,
  ): Promise<BookingSlotDefinition> {
    const studioId = await this.requireStudioId(actor);

    return this.bookingSlotDefinitionsRepository.create({
      studioId,
      label: input.label,
      startHour: input.startHour,
      startMinute: input.startMinute ?? 0,
      endHour: input.endHour,
      endMinute: input.endMinute ?? 0,
      isCustom: input.isCustom ?? false,
      sortOrder: input.sortOrder ?? 0,
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: ListBookingSlotDefinitionsQueryInput,
  ): Promise<{ data: BookingSlotDefinition[]; meta: PaginationMetaDto }> {
    const studioId = await this.requireStudioId(actor);
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.bookingSlotDefinitionsRepository.findMany({ studioId, skip, take: pageSize, search }),
      this.bookingSlotDefinitionsRepository.count(studioId, search),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  async pullChanges(
    actor: AuthenticatedUser,
    query: SyncBookingSlotDefinitionsPullQueryInput,
  ): Promise<{ data: BookingSlotDefinition[]; serverTime: string; hasMore: boolean }> {
    const studioId = await this.requireStudioId(actor);
    const serverNow = new Date();
    let since = query.since ? new Date(query.since) : undefined;
    if (since && Number.isNaN(since.getTime())) {
      since = undefined;
    }
    if (since && since.getTime() > serverNow.getTime()) {
      since = undefined;
    }

    const take = SYNC.MAX_BOOKING_SLOT_DEFINITIONS_PULL_BATCH;
    const rows = await this.bookingSlotDefinitionsRepository.findChangesSince({
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

  async getById(actor: AuthenticatedUser, id: string): Promise<BookingSlotDefinition> {
    const studioId = await this.requireStudioId(actor);
    const slot = await this.bookingSlotDefinitionsRepository.findById(id, studioId);
    if (!slot) {
      throw new NotFoundException(`Booking slot definition ${id} not found`);
    }
    return slot;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateBookingSlotDefinitionInput,
  ): Promise<BookingSlotDefinition> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.bookingSlotDefinitionsRepository.findById(id, studioId);
    if (!existing) {
      throw new NotFoundException(`Booking slot definition ${id} not found`);
    }

    const updateData: Parameters<BookingSlotDefinitionsRepository["update"]>[2] = {};
    if (input.label !== undefined) updateData.label = input.label;
    if (input.startHour !== undefined) updateData.startHour = input.startHour;
    if (input.startMinute !== undefined) updateData.startMinute = input.startMinute;
    if (input.endHour !== undefined) updateData.endHour = input.endHour;
    if (input.endMinute !== undefined) updateData.endMinute = input.endMinute;
    if (input.isCustom !== undefined) updateData.isCustom = input.isCustom;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

    try {
      return await this.bookingSlotDefinitionsRepository.update(id, studioId, updateData);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("BOOKING_SLOT_DEFINITION_NOT_FOUND:")
      ) {
        throw new NotFoundException(`Booking slot definition ${id} not found`);
      }
      throw error;
    }
  }

  async softDelete(actor: AuthenticatedUser, id: string): Promise<void> {
    const studioId = await this.requireStudioId(actor);
    try {
      await this.bookingSlotDefinitionsRepository.softDelete(id, studioId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("BOOKING_SLOT_DEFINITION_NOT_FOUND:")
      ) {
        throw new NotFoundException(`Booking slot definition ${id} not found`);
      }
      throw error;
    }
  }

  async requireStudioId(actor: AuthenticatedUser): Promise<string> {
    if (actor.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new ForbiddenException("Platform admin cannot access booking slot definitions");
    }

    const user = await this.authRepository.findById(actor.userId);
    if (!user?.studioId) {
      throw new UnauthorizedException("Studio context required");
    }
    return user.studioId;
  }
}
