import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingsRepository } from "../bookings/bookings.repository";
import { ClientsRepository } from "../clients/clients.repository";
import { StudiosRepository } from "../studios/studios.repository";
import { SessionsRepository } from "./sessions.repository";
import { SessionsService } from "./sessions.service";

describe("SessionsService", () => {
  let service: SessionsService;
  let sessionsRepository: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByBookingId: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    complete: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let bookingsRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let studiosRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let clientsRepository: {
    findById: ReturnType<typeof vi.fn>;
  };

  const session = {
    id: "session-1",
    studioId: "studio-1",
    clientId: null,
    bookingId: null,
    title: "Tracking session",
    startedAt: new Date("2026-07-03T14:00:00.000Z"),
    endedAt: null,
    status: "scheduled" as const,
    notes: null,
    deletedAt: null,
    createdAt: new Date("2026-07-03T00:00:00.000Z"),
    updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    studioName: "Downtown",
    clientName: null,
    bookingTitle: null,
  };

  beforeEach(() => {
    sessionsRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByBookingId: vi.fn(),
      findMany: vi.fn(),
      start: vi.fn(),
      complete: vi.fn(),
      cancel: vi.fn(),
      update: vi.fn(),
    };
    bookingsRepository = {
      findById: vi.fn(),
    };
    studiosRepository = {
      findById: vi.fn(),
    };
    clientsRepository = {
      findById: vi.fn(),
    };

    service = new SessionsService(
      sessionsRepository as unknown as SessionsRepository,
      bookingsRepository as unknown as BookingsRepository,
      studiosRepository as unknown as StudiosRepository,
      clientsRepository as unknown as ClientsRepository,
    );
  });

  it("creates an ad hoc scheduled session", async () => {
    studiosRepository.findById.mockResolvedValue({ id: "studio-1", name: "Downtown" });
    sessionsRepository.create.mockResolvedValue(session);

    await expect(
      service.create({
        studioId: "studio-1",
        clientId: null,
        bookingId: null,
        title: "Tracking session",
        startedAt: "2026-07-03T14:00:00.000Z",
        notes: null,
      }),
    ).resolves.toEqual(session);
  });

  it("creates a session from a booking", async () => {
    bookingsRepository.findById.mockResolvedValue({
      id: "booking-1",
      studioId: "studio-1",
      clientId: null,
      title: "Mix session",
      startAt: new Date("2026-07-03T14:00:00.000Z"),
      notes: null,
    });
    sessionsRepository.findByBookingId.mockResolvedValue(null);
    studiosRepository.findById.mockResolvedValue({ id: "studio-1", name: "Downtown" });
    sessionsRepository.create.mockResolvedValue({ ...session, bookingId: "booking-1" });

    await expect(service.create({ bookingId: "booking-1", clientId: null, notes: null })).resolves.toMatchObject({
      bookingId: "booking-1",
    });
  });

  it("throws when a session already exists for the booking", async () => {
    bookingsRepository.findById.mockResolvedValue({
      id: "booking-1",
      studioId: "studio-1",
      clientId: null,
      title: "Mix session",
      startAt: new Date("2026-07-03T14:00:00.000Z"),
      notes: null,
    });
    sessionsRepository.findByBookingId.mockResolvedValue(session);

    await expect(
      service.create({ bookingId: "booking-1", clientId: null, notes: null }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("starts a scheduled session", async () => {
    sessionsRepository.findById.mockResolvedValue(session);
    sessionsRepository.start.mockResolvedValue({ ...session, status: "in_progress" });

    await expect(service.start("session-1")).resolves.toMatchObject({ status: "in_progress" });
  });

  it("throws when completing a scheduled session", async () => {
    sessionsRepository.findById.mockResolvedValue(session);

    await expect(service.complete("session-1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("completes an in-progress session", async () => {
    sessionsRepository.findById.mockResolvedValue({ ...session, status: "in_progress" });
    sessionsRepository.complete.mockResolvedValue({
      ...session,
      status: "completed",
      endedAt: new Date("2026-07-03T16:00:00.000Z"),
    });

    await expect(service.complete("session-1")).resolves.toMatchObject({ status: "completed" });
  });

  it("cancels a scheduled session", async () => {
    sessionsRepository.findById.mockResolvedValue(session);
    sessionsRepository.cancel.mockResolvedValue({ ...session, status: "cancelled" });

    await expect(service.cancel("session-1")).resolves.toBeUndefined();
  });

  it("throws when session is missing", async () => {
    sessionsRepository.findById.mockResolvedValue(null);

    await expect(service.getById("missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});
