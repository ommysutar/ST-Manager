import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PLATFORM_ROLES, SYNC } from "@st-manager/constants";
import type { PaginationMetaDto } from "@st-manager/contracts";
import type { StudioRoom } from "@st-manager/types";
import type {
  CreateStudioRoomInput,
  ListStudioRoomsQueryInput,
  SyncStudioRoomsPullQueryInput,
  UpdateStudioRoomInput,
} from "@st-manager/validation";

import { AuthRepository } from "../auth/auth.repository";
import type { AuthenticatedUser } from "../auth/auth.types";
import { StudioRoomsRepository } from "./studio-rooms.repository";

@Injectable()
export class StudioRoomsService {
  constructor(
    private readonly studioRoomsRepository: StudioRoomsRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async create(actor: AuthenticatedUser, input: CreateStudioRoomInput): Promise<StudioRoom> {
    const studioId = await this.requireStudioId(actor);

    return this.studioRoomsRepository.create({
      studioId,
      name: input.name,
      roomName: input.roomName ?? null,
      description: input.description ?? "",
      color: input.color ?? "#6366f1",
      active: input.active ?? true,
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: ListStudioRoomsQueryInput,
  ): Promise<{ data: StudioRoom[]; meta: PaginationMetaDto }> {
    const studioId = await this.requireStudioId(actor);
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.studioRoomsRepository.findMany({ studioId, skip, take: pageSize, search }),
      this.studioRoomsRepository.count(studioId, search),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  async pullChanges(
    actor: AuthenticatedUser,
    query: SyncStudioRoomsPullQueryInput,
  ): Promise<{ data: StudioRoom[]; serverTime: string; hasMore: boolean }> {
    const studioId = await this.requireStudioId(actor);
    const serverNow = new Date();
    let since = query.since ? new Date(query.since) : undefined;
    if (since && Number.isNaN(since.getTime())) {
      since = undefined;
    }
    if (since && since.getTime() > serverNow.getTime()) {
      since = undefined;
    }

    const take = SYNC.MAX_STUDIO_ROOMS_PULL_BATCH;
    const rows = await this.studioRoomsRepository.findChangesSince({
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

  async getById(actor: AuthenticatedUser, id: string): Promise<StudioRoom> {
    const studioId = await this.requireStudioId(actor);
    const room = await this.studioRoomsRepository.findById(id, studioId);
    if (!room) {
      throw new NotFoundException(`Studio room ${id} not found`);
    }
    return room;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateStudioRoomInput,
  ): Promise<StudioRoom> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.studioRoomsRepository.findById(id, studioId);
    if (!existing) {
      throw new NotFoundException(`Studio room ${id} not found`);
    }

    const updateData: Parameters<StudioRoomsRepository["update"]>[2] = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.roomName !== undefined) updateData.roomName = input.roomName;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.active !== undefined) updateData.active = input.active;

    try {
      return await this.studioRoomsRepository.update(id, studioId, updateData);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("STUDIO_ROOM_NOT_FOUND:")) {
        throw new NotFoundException(`Studio room ${id} not found`);
      }
      throw error;
    }
  }

  async softDelete(actor: AuthenticatedUser, id: string): Promise<void> {
    const studioId = await this.requireStudioId(actor);
    try {
      await this.studioRoomsRepository.softDelete(id, studioId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("STUDIO_ROOM_NOT_FOUND:")) {
        throw new NotFoundException(`Studio room ${id} not found`);
      }
      throw error;
    }
  }

  async requireStudioId(actor: AuthenticatedUser): Promise<string> {
    if (actor.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new ForbiddenException("Platform admin cannot access studio rooms");
    }

    const user = await this.authRepository.findById(actor.userId);
    if (!user?.studioId) {
      throw new UnauthorizedException("Studio context required");
    }
    return user.studioId;
  }
}
