import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingsRepository } from "../bookings/bookings.repository";
import { ClientsRepository } from "../clients/clients.repository";
import { StudiosRepository } from "../studios/studios.repository";
import { DashboardService } from "./dashboard.service";

describe("DashboardService", () => {
  let service: DashboardService;
  let studiosRepository: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  let clientsRepository: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  let bookingsRepository: {
    findToday: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    studiosRepository = {
      count: vi.fn(),
      findMany: vi.fn(),
    };
    clientsRepository = {
      count: vi.fn(),
      findMany: vi.fn(),
    };
    bookingsRepository = {
      findToday: vi.fn(),
    };

    service = new DashboardService(
      studiosRepository as unknown as StudiosRepository,
      clientsRepository as unknown as ClientsRepository,
      bookingsRepository as unknown as BookingsRepository,
    );
  });

  it("aggregates studio, client, and booking KPIs", async () => {
    const studio = {
      id: "studio-1",
      name: "Downtown Studio",
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    };
    const client = {
      id: "client-1",
      name: "Acme Records",
      email: null,
      phone: null,
      company: "Acme",
      notes: null,
      deletedAt: null,
      createdAt: new Date("2026-07-03T01:00:00.000Z"),
      updatedAt: new Date("2026-07-03T01:00:00.000Z"),
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
      studioName: "Downtown Studio",
      clientName: null,
    };

    studiosRepository.count.mockResolvedValue(3);
    studiosRepository.findMany.mockResolvedValue([studio]);
    clientsRepository.count.mockResolvedValue(2);
    clientsRepository.findMany.mockResolvedValue([client]);
    bookingsRepository.findToday.mockResolvedValue([booking]);

    await expect(service.getSummary()).resolves.toEqual({
      studioCount: 3,
      recentStudios: [
        {
          id: "studio-1",
          name: "Downtown Studio",
          createdAt: "2026-07-03T00:00:00.000Z",
          updatedAt: "2026-07-03T00:00:00.000Z",
        },
      ],
      todayBookings: [
        {
          id: "booking-1",
          title: "Mix session",
          studioId: "studio-1",
          studioName: "Downtown Studio",
          startAt: "2026-07-03T14:00:00.000Z",
          endAt: "2026-07-03T16:00:00.000Z",
        },
      ],
      clientCount: 2,
      recentClients: [
        {
          id: "client-1",
          name: "Acme Records",
          company: "Acme",
          createdAt: "2026-07-03T01:00:00.000Z",
        },
      ],
      monthRevenue: 0,
      utilizationPercent: 0,
    });
  });

  it("returns empty recent collections when none exist", async () => {
    studiosRepository.count.mockResolvedValue(0);
    studiosRepository.findMany.mockResolvedValue([]);
    clientsRepository.count.mockResolvedValue(0);
    clientsRepository.findMany.mockResolvedValue([]);
    bookingsRepository.findToday.mockResolvedValue([]);

    const summary = await service.getSummary();

    expect(summary.recentStudios).toEqual([]);
    expect(summary.recentClients).toEqual([]);
    expect(summary.todayBookings).toEqual([]);
  });
});
