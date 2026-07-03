import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientsRepository } from "../clients/clients.repository";
import { StudiosRepository } from "../studios/studios.repository";
import { BookingsRepository } from "./bookings.repository";
import { BookingsService } from "./bookings.service";

describe("BookingsService", () => {
  let service: BookingsService;
  let bookingsRepository: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findManyInRange: ReturnType<typeof vi.fn>;
    findOverlapping: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  let studiosRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let clientsRepository: {
    findById: ReturnType<typeof vi.fn>;
  };

  const booking = {
    id: "booking-1",
    studioId: "studio-1",
    clientId: null,
    title: "Mix session",
    startAt: new Date("2026-07-03T14:00:00.000Z"),
    endAt: new Date("2026-07-03T16:00:00.000Z"),
    status: "confirmed" as const,
    notes: null,
    deletedAt: null,
    createdAt: new Date("2026-07-03T00:00:00.000Z"),
    updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    studioName: "Downtown",
    clientName: null,
  };

  beforeEach(() => {
    bookingsRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findManyInRange: vi.fn(),
      findOverlapping: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
    };
    studiosRepository = {
      findById: vi.fn(),
    };
    clientsRepository = {
      findById: vi.fn(),
    };

    service = new BookingsService(
      bookingsRepository as unknown as BookingsRepository,
      studiosRepository as unknown as StudiosRepository,
      clientsRepository as unknown as ClientsRepository,
    );
  });

  it("creates a booking when no conflicts exist", async () => {
    studiosRepository.findById.mockResolvedValue({ id: "studio-1", name: "Downtown" });
    bookingsRepository.findOverlapping.mockResolvedValue([]);
    bookingsRepository.create.mockResolvedValue(booking);

    await expect(
      service.create({
        studioId: "studio-1",
        clientId: null,
        title: "Mix session",
        startAt: "2026-07-03T14:00:00.000Z",
        endAt: "2026-07-03T16:00:00.000Z",
        notes: null,
      }),
    ).resolves.toEqual(booking);
  });

  it("throws when a booking conflict exists", async () => {
    studiosRepository.findById.mockResolvedValue({ id: "studio-1", name: "Downtown" });
    bookingsRepository.findOverlapping.mockResolvedValue([booking]);

    await expect(
      service.create({
        studioId: "studio-1",
        clientId: null,
        title: "Overlap",
        startAt: "2026-07-03T15:00:00.000Z",
        endAt: "2026-07-03T17:00:00.000Z",
        notes: null,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("throws when studio is missing", async () => {
    studiosRepository.findById.mockResolvedValue(null);

    await expect(
      service.create({
        studioId: "missing-studio",
        clientId: null,
        title: "Mix session",
        startAt: "2026-07-03T14:00:00.000Z",
        endAt: "2026-07-03T16:00:00.000Z",
        notes: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws when client is missing", async () => {
    studiosRepository.findById.mockResolvedValue({ id: "studio-1", name: "Downtown" });
    clientsRepository.findById.mockResolvedValue(null);

    await expect(
      service.create({
        studioId: "studio-1",
        clientId: "missing-client",
        title: "Mix session",
        startAt: "2026-07-03T14:00:00.000Z",
        endAt: "2026-07-03T16:00:00.000Z",
        notes: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("cancels an existing booking", async () => {
    bookingsRepository.findById.mockResolvedValue(booking);
    bookingsRepository.cancel.mockResolvedValue({ ...booking, status: "cancelled" });

    await expect(service.cancel("booking-1")).resolves.toBeUndefined();
    expect(bookingsRepository.cancel).toHaveBeenCalledWith("booking-1");
  });
});
