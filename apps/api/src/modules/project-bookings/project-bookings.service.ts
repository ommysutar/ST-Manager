import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { API_ERROR_CODES, PLATFORM_ROLES, SYNC } from "@st-manager/constants";
import type { PaginationMetaDto } from "@st-manager/contracts";
import type { ProjectBooking, ProjectBookingPayload, ProjectBookingStatus } from "@st-manager/types";
import type {
  CreateProjectBookingInput,
  ListProjectBookingsQueryInput,
  SyncProjectBookingsPullQueryInput,
  UpdateProjectBookingInput,
} from "@st-manager/validation";

import { AuthRepository } from "../auth/auth.repository";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ProjectsRepository } from "../projects/projects.repository";
import {
  normalizePayload,
  OCCUPYING_PROJECT_BOOKING_STATUSES,
  ProjectBookingsRepository,
} from "./project-bookings.repository";

function buildPayloadFromInput(input: {
  engineerId?: string | null;
  sessionId?: string | null;
  attendanceRecorded?: boolean;
  equipmentIds?: string[];
}): ProjectBookingPayload {
  return {
    engineerId: input.engineerId ?? null,
    sessionId: input.sessionId ?? null,
    attendanceRecorded: input.attendanceRecorded ?? false,
    equipmentIds: input.equipmentIds ?? [],
  };
}

function mergePayload(
  existing: ProjectBookingPayload,
  input: UpdateProjectBookingInput,
): ProjectBookingPayload {
  return {
    engineerId: input.engineerId !== undefined ? input.engineerId : existing.engineerId,
    sessionId: input.sessionId !== undefined ? input.sessionId : existing.sessionId,
    attendanceRecorded:
      input.attendanceRecorded !== undefined
        ? input.attendanceRecorded
        : existing.attendanceRecorded,
    equipmentIds: input.equipmentIds !== undefined ? input.equipmentIds : existing.equipmentIds,
    slotConflict: existing.slotConflict,
  };
}

function statusOccupiesSlot(status: ProjectBookingStatus): boolean {
  return OCCUPYING_PROJECT_BOOKING_STATUSES.includes(status);
}

@Injectable()
export class ProjectBookingsService {
  constructor(
    private readonly projectBookingsRepository: ProjectBookingsRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async create(
    actor: AuthenticatedUser,
    input: CreateProjectBookingInput,
  ): Promise<ProjectBooking> {
    const studioId = await this.requireStudioId(actor);
    await this.assertProjectInStudio(input.projectId, studioId);

    const status = input.status ?? "booked";
    if (statusOccupiesSlot(status)) {
      await this.assertSlotAvailable({
        studioId,
        roomStudioId: input.roomStudioId,
        date: input.date,
        slotId: input.slotId,
      });
    }

    return this.projectBookingsRepository.create({
      studioId,
      projectId: input.projectId,
      roomStudioId: input.roomStudioId,
      clientId: input.clientId ?? null,
      bookingFor: input.bookingFor,
      notes: input.notes ?? "",
      date: input.date,
      slotId: input.slotId,
      status,
      clientName: input.clientName,
      projectName: input.projectName,
      projectNumber: input.projectNumber ?? "",
      payload: buildPayloadFromInput(input),
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: ListProjectBookingsQueryInput,
  ): Promise<{ data: ProjectBooking[]; meta: PaginationMetaDto }> {
    const studioId = await this.requireStudioId(actor);
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.projectBookingsRepository.findMany({ studioId, skip, take: pageSize, search }),
      this.projectBookingsRepository.count(studioId, search),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  async pullChanges(
    actor: AuthenticatedUser,
    query: SyncProjectBookingsPullQueryInput,
  ): Promise<{ data: ProjectBooking[]; serverTime: string; hasMore: boolean }> {
    const studioId = await this.requireStudioId(actor);
    const serverNow = new Date();
    let since = query.since ? new Date(query.since) : undefined;
    if (since && Number.isNaN(since.getTime())) {
      since = undefined;
    }
    if (since && since.getTime() > serverNow.getTime()) {
      since = undefined;
    }

    const take = SYNC.MAX_PROJECT_BOOKINGS_PULL_BATCH;
    const rows = await this.projectBookingsRepository.findChangesSince({
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

  async getById(actor: AuthenticatedUser, id: string): Promise<ProjectBooking> {
    const studioId = await this.requireStudioId(actor);
    const booking = await this.projectBookingsRepository.findById(id, studioId);
    if (!booking) {
      throw new NotFoundException(`Project booking ${id} not found`);
    }
    return booking;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateProjectBookingInput,
  ): Promise<ProjectBooking> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.projectBookingsRepository.findById(id, studioId);
    if (!existing) {
      throw new NotFoundException(`Project booking ${id} not found`);
    }

    if (input.projectId !== undefined) {
      await this.assertProjectInStudio(input.projectId, studioId);
    }

    const nextRoomStudioId = input.roomStudioId ?? existing.roomStudioId;
    const nextDate = input.date ?? existing.date;
    const nextSlotId = input.slotId ?? existing.slotId;
    const nextStatus = input.status ?? existing.status;

    if (statusOccupiesSlot(nextStatus)) {
      await this.assertSlotAvailable({
        studioId,
        roomStudioId: nextRoomStudioId,
        date: nextDate,
        slotId: nextSlotId,
        excludeId: id,
      });
    }

    const payloadFieldsProvided =
      input.engineerId !== undefined ||
      input.sessionId !== undefined ||
      input.attendanceRecorded !== undefined ||
      input.equipmentIds !== undefined;

    const updateData: Parameters<ProjectBookingsRepository["update"]>[2] = {};
    if (input.projectId !== undefined) updateData.projectId = input.projectId;
    if (input.roomStudioId !== undefined) updateData.roomStudioId = input.roomStudioId;
    if (input.clientId !== undefined) updateData.clientId = input.clientId;
    if (input.bookingFor !== undefined) updateData.bookingFor = input.bookingFor;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.date !== undefined) updateData.date = input.date;
    if (input.slotId !== undefined) updateData.slotId = input.slotId;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.clientName !== undefined) updateData.clientName = input.clientName;
    if (input.projectName !== undefined) updateData.projectName = input.projectName;
    if (input.projectNumber !== undefined) updateData.projectNumber = input.projectNumber;
    if (payloadFieldsProvided) {
      updateData.payload = mergePayload(normalizePayload(existing.payload), input);
    }

    try {
      return await this.projectBookingsRepository.update(id, studioId, updateData);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("PROJECT_BOOKING_NOT_FOUND:")) {
        throw new NotFoundException(`Project booking ${id} not found`);
      }
      throw error;
    }
  }

  async softDelete(actor: AuthenticatedUser, id: string): Promise<void> {
    const studioId = await this.requireStudioId(actor);
    try {
      await this.projectBookingsRepository.softDelete(id, studioId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("PROJECT_BOOKING_NOT_FOUND:")) {
        throw new NotFoundException(`Project booking ${id} not found`);
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

  private async assertSlotAvailable(params: {
    studioId: string;
    roomStudioId: string;
    date: string;
    slotId: string;
    excludeId?: string;
  }): Promise<void> {
    const conflict = await this.projectBookingsRepository.findOccupyingConflict(params);
    if (conflict) {
      throw new ConflictException({
        message: "Studio already booked.",
        details: { code: API_ERROR_CODES.SLOT_CONFLICT },
      });
    }
  }

  async requireStudioId(actor: AuthenticatedUser): Promise<string> {
    if (actor.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new ForbiddenException("Platform admin cannot access studio project bookings");
    }

    const user = await this.authRepository.findById(actor.userId);
    if (!user?.studioId) {
      throw new UnauthorizedException("Studio context required");
    }
    return user.studioId;
  }
}

export { buildPayloadFromInput, mergePayload };
