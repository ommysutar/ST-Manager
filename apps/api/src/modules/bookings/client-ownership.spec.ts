import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientsRepository } from "../clients/clients.repository";
import { StudiosRepository } from "../studios/studios.repository";
import { BookingsRepository } from "./bookings.repository";
import { BookingsService } from "./bookings.service";

describe("BookingsService client studio ownership", () => {
  let service: BookingsService;
  let bookingsRepository: { create: ReturnType<typeof vi.fn>; findOverlapping: ReturnType<typeof vi.fn> };
  let studiosRepository: { findById: ReturnType<typeof vi.fn> };
  let clientsRepository: { findById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    bookingsRepository = {
      create: vi.fn(),
      findOverlapping: vi.fn().mockResolvedValue([]),
    };
    studiosRepository = {
      findById: vi.fn().mockResolvedValue({ id: "studio-a" }),
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

  it("rejects a foreign studio clientId", async () => {
    clientsRepository.findById.mockResolvedValue(null);

    await expect(
      service.create({
        studioId: "studio-a",
        clientId: "client-other-studio",
        title: "Mix",
        startAt: "2026-08-10T10:00:00.000Z",
        endAt: "2026-08-10T11:00:00.000Z",
        notes: null,
      }),
    ).rejects.toThrow("Client client-other-studio not found");

    expect(clientsRepository.findById).toHaveBeenCalledWith("client-other-studio", "studio-a");
    expect(bookingsRepository.create).not.toHaveBeenCalled();
  });

  it("accepts a same-studio clientId", async () => {
    clientsRepository.findById.mockResolvedValue({
      id: "client-a",
      studioId: "studio-a",
      name: "Acme",
    });
    bookingsRepository.create.mockResolvedValue({
      id: "booking-1",
      studioId: "studio-a",
      clientId: "client-a",
      title: "Mix",
      startAt: new Date("2026-08-10T10:00:00.000Z"),
      endAt: new Date("2026-08-10T11:00:00.000Z"),
      status: "confirmed",
      notes: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      studioName: "A",
      clientName: "Acme",
    });

    await expect(
      service.create({
        studioId: "studio-a",
        clientId: "client-a",
        title: "Mix",
        startAt: "2026-08-10T10:00:00.000Z",
        endAt: "2026-08-10T11:00:00.000Z",
        notes: null,
      }),
    ).resolves.toMatchObject({ id: "booking-1", clientId: "client-a" });
  });
});
