import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { BookingWithRelations } from "@st-manager/types";
import type { CreateBookingInput, ListBookingsQueryInput, UpdateBookingInput } from "@st-manager/validation";

import { ClientsRepository } from "../clients/clients.repository";
import { StudiosRepository } from "../studios/studios.repository";
import { BookingsRepository } from "./bookings.repository";

const MIN_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly studiosRepository: StudiosRepository,
    private readonly clientsRepository: ClientsRepository,
  ) {}

  async create(input: CreateBookingInput): Promise<BookingWithRelations> {
    await this.assertStudioExists(input.studioId);
    await this.assertClientActive(input.clientId ?? null, input.studioId);

    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    this.assertValidInterval(startAt, endAt);
    await this.assertNoConflict(input.studioId, startAt, endAt);

    return this.bookingsRepository.create({
      studioId: input.studioId,
      clientId: input.clientId ?? null,
      title: input.title,
      startAt,
      endAt,
      notes: input.notes ?? null,
    });
  }

  async listByRange(query: ListBookingsQueryInput): Promise<BookingWithRelations[]> {
    await this.assertStudioExists(query.studioId);

    return this.bookingsRepository.findManyInRange({
      studioId: query.studioId,
      from: new Date(query.from),
      to: new Date(query.to),
    });
  }

  async getById(id: string): Promise<BookingWithRelations> {
    const booking = await this.bookingsRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    return booking;
  }

  async update(id: string, input: UpdateBookingInput): Promise<BookingWithRelations> {
    const existing = await this.getById(id);

    const studioId = input.studioId ?? existing.studioId;
    const clientId = input.clientId !== undefined ? input.clientId : existing.clientId;
    const title = input.title ?? existing.title;
    const startAt = input.startAt ? new Date(input.startAt) : existing.startAt;
    const endAt = input.endAt ? new Date(input.endAt) : existing.endAt;
    const notes = input.notes !== undefined ? input.notes : existing.notes;

    await this.assertStudioExists(studioId);
    await this.assertClientActive(clientId, studioId);
    this.assertValidInterval(startAt, endAt);
    await this.assertNoConflict(studioId, startAt, endAt, id);

    return this.bookingsRepository.update(id, {
      studioId,
      clientId,
      title,
      startAt,
      endAt,
      notes,
    });
  }

  async cancel(id: string): Promise<void> {
    await this.getById(id);
    await this.bookingsRepository.cancel(id);
  }

  private async assertStudioExists(studioId: string): Promise<void> {
    const studio = await this.studiosRepository.findById(studioId);
    if (!studio) {
      throw new NotFoundException(`Studio ${studioId} not found`);
    }
  }

  /** Ensures the client exists, is active, and belongs to the same studio as the booking. */
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

  private assertValidInterval(startAt: Date, endAt: Date): void {
    if (endAt.getTime() - startAt.getTime() < MIN_DURATION_MS) {
      throw new ConflictException({
        message: "End time must be at least 15 minutes after start time",
        details: { code: "BOOKING_CONFLICT" },
      });
    }
  }

  private async assertNoConflict(
    studioId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await this.bookingsRepository.findOverlapping({
      studioId,
      startAt,
      endAt,
      excludeId,
    });

    if (overlapping.length > 0) {
      throw new ConflictException({
        message: "Booking overlaps with an existing reservation for this studio",
        details: { code: "BOOKING_CONFLICT" },
      });
    }
  }
}
