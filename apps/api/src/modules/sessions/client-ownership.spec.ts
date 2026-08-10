import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingsRepository } from "../bookings/bookings.repository";
import { ClientsRepository } from "../clients/clients.repository";
import { StudiosRepository } from "../studios/studios.repository";
import { SessionsRepository } from "./sessions.repository";
import { SessionsService } from "./sessions.service";

describe("SessionsService client studio ownership", () => {
  let service: SessionsService;
  let sessionsRepository: { create: ReturnType<typeof vi.fn> };
  let bookingsRepository: Record<string, never>;
  let studiosRepository: { findById: ReturnType<typeof vi.fn> };
  let clientsRepository: { findById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sessionsRepository = { create: vi.fn() };
    bookingsRepository = {};
    studiosRepository = { findById: vi.fn().mockResolvedValue({ id: "studio-a" }) };
    clientsRepository = { findById: vi.fn() };

    service = new SessionsService(
      sessionsRepository as unknown as SessionsRepository,
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
        clientId: "client-foreign",
        bookingId: null,
        title: "Track",
        startedAt: "2026-08-10T10:00:00.000Z",
        notes: null,
      }),
    ).rejects.toThrow("Client client-foreign not found");

    expect(clientsRepository.findById).toHaveBeenCalledWith("client-foreign", "studio-a");
    expect(sessionsRepository.create).not.toHaveBeenCalled();
  });

  it("accepts a same-studio clientId", async () => {
    clientsRepository.findById.mockResolvedValue({
      id: "client-a",
      studioId: "studio-a",
      name: "Acme",
    });
    sessionsRepository.create.mockResolvedValue({
      id: "session-1",
      studioId: "studio-a",
      clientId: "client-a",
      bookingId: null,
      title: "Track",
      startedAt: new Date("2026-08-10T10:00:00.000Z"),
      endedAt: null,
      status: "scheduled",
      notes: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      studioName: "A",
      clientName: "Acme",
      bookingTitle: null,
    });

    await expect(
      service.create({
        studioId: "studio-a",
        clientId: "client-a",
        bookingId: null,
        title: "Track",
        startedAt: "2026-08-10T10:00:00.000Z",
        notes: null,
      }),
    ).resolves.toMatchObject({ id: "session-1", clientId: "client-a" });
  });
});
