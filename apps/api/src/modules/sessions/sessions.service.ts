import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { API_ERROR_CODES } from "@st-manager/constants";
import type { SessionWithRelations } from "@st-manager/types";
import type {
  CreateSessionInput,
  ListSessionsQueryInput,
  UpdateSessionInput,
} from "@st-manager/validation";

import { BookingsRepository } from "../bookings/bookings.repository";
import { ClientsRepository } from "../clients/clients.repository";
import { StudiosRepository } from "../studios/studios.repository";
import { SessionsRepository } from "./sessions.repository";

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly bookingsRepository: BookingsRepository,
    private readonly studiosRepository: StudiosRepository,
    private readonly clientsRepository: ClientsRepository,
  ) {}

  async create(input: CreateSessionInput): Promise<SessionWithRelations> {
    if (input.bookingId) {
      return this.createFromBooking(input);
    }

    if (!input.studioId || !input.title || !input.startedAt) {
      throw new ConflictException({
        message: "studioId, title, and startedAt are required when bookingId is not provided",
        details: { code: API_ERROR_CODES.VALIDATION_ERROR },
      });
    }

    await this.assertStudioExists(input.studioId);
    await this.assertClientActive(input.clientId ?? null, input.studioId);

    return this.sessionsRepository.create({
      studioId: input.studioId,
      clientId: input.clientId ?? null,
      bookingId: null,
      title: input.title,
      startedAt: new Date(input.startedAt),
      notes: input.notes ?? null,
    });
  }

  async list(query: ListSessionsQueryInput): Promise<{
    items: SessionWithRelations[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const result = await this.sessionsRepository.findMany(query);
    return {
      ...result,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getById(id: string): Promise<SessionWithRelations> {
    const session = await this.sessionsRepository.findById(id);
    if (!session) {
      throw new NotFoundException(`Session ${id} not found`);
    }

    return session;
  }

  async update(id: string, input: UpdateSessionInput): Promise<SessionWithRelations> {
    const existing = await this.getById(id);
    if (existing.status !== "scheduled") {
      throw this.invalidTransition("Only scheduled sessions can be edited");
    }

    const studioId = input.studioId ?? existing.studioId;
    const clientId = input.clientId !== undefined ? input.clientId : existing.clientId;
    const title = input.title ?? existing.title;
    const startedAt = input.startedAt ? new Date(input.startedAt) : existing.startedAt;
    const notes = input.notes !== undefined ? input.notes : existing.notes;

    await this.assertStudioExists(studioId);
    await this.assertClientActive(clientId, studioId);

    return this.sessionsRepository.update(id, {
      studioId,
      clientId,
      title,
      startedAt,
      notes,
    });
  }

  async start(id: string): Promise<SessionWithRelations> {
    const session = await this.getById(id);
    if (session.status !== "scheduled") {
      throw this.invalidTransition("Only scheduled sessions can be started");
    }

    return this.sessionsRepository.start(id, new Date());
  }

  async complete(id: string): Promise<SessionWithRelations> {
    const session = await this.getById(id);
    if (session.status !== "in_progress") {
      throw this.invalidTransition("Only in-progress sessions can be completed");
    }

    return this.sessionsRepository.complete(id, new Date());
  }

  async cancel(id: string): Promise<void> {
    const session = await this.getById(id);
    if (session.status !== "scheduled" && session.status !== "in_progress") {
      throw this.invalidTransition("Only scheduled or in-progress sessions can be cancelled");
    }

    await this.sessionsRepository.cancel(id);
  }

  private async createFromBooking(input: CreateSessionInput): Promise<SessionWithRelations> {
    const bookingId = input.bookingId!;
    const booking = await this.bookingsRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const linkedSession = await this.sessionsRepository.findAnyByBookingId(bookingId);
    if (linkedSession) {
      if (linkedSession.status !== "cancelled") {
        throw new ConflictException({
          message: "A session already exists for this booking",
          details: { code: API_ERROR_CODES.SESSION_BOOKING_ALREADY_LINKED },
        });
      }

      await this.sessionsRepository.releaseBookingLink(linkedSession.id);
    }

    const studioId = input.studioId ?? booking.studioId;
    const clientId = input.clientId !== undefined ? input.clientId : booking.clientId;
    const title = input.title ?? booking.title;
    const startedAt = input.startedAt ? new Date(input.startedAt) : booking.startAt;

    await this.assertStudioExists(studioId);
    await this.assertClientActive(clientId, studioId);

    return this.sessionsRepository.create({
      studioId,
      clientId,
      bookingId,
      title,
      startedAt,
      notes: input.notes ?? booking.notes,
    });
  }

  private async assertStudioExists(studioId: string): Promise<void> {
    const studio = await this.studiosRepository.findById(studioId);
    if (!studio) {
      throw new NotFoundException(`Studio ${studioId} not found`);
    }
  }

  /** Ensures the client exists, is active, and belongs to the same studio as the session. */
  private async assertClientActive(
    clientId: string | null,
    studioId: string,
  ): Promise<void> {
    if (!clientId) {
      return;
    }

    const client = await this.clientsRepository.findById(clientId, studioId);
    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }
  }

  private invalidTransition(message: string): ConflictException {
    return new ConflictException({
      message,
      details: { code: API_ERROR_CODES.SESSION_INVALID_TRANSITION },
    });
  }
}
