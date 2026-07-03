import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportsRepository } from "./reports.repository";
import { ReportsService, buildRevenueTrend, computeUtilization } from "./reports.service";

describe("ReportsService", () => {
  let service: ReportsService;
  let repository: {
    findStudios: ReturnType<typeof vi.fn>;
    findActiveClients: ReturnType<typeof vi.fn>;
    findPaidInvoicesInRange: ReturnType<typeof vi.fn>;
    findCompletedSessionsInRange: ReturnType<typeof vi.fn>;
    findBookingsInRange: ReturnType<typeof vi.fn>;
    findSessionsInRange: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findStudios: vi.fn(),
      findActiveClients: vi.fn(),
      findPaidInvoicesInRange: vi.fn(),
      findCompletedSessionsInRange: vi.fn(),
      findBookingsInRange: vi.fn(),
      findSessionsInRange: vi.fn(),
    };

    service = new ReportsService(repository as unknown as ReportsRepository);
  });

  it("aggregates revenue by paid invoice date", async () => {
    repository.findPaidInvoicesInRange.mockResolvedValue([
      {
        id: "invoice-1",
        clientId: "client-1",
        total: 330,
        paidAt: new Date("2026-07-03T12:00:00.000Z"),
        number: "000001",
        clientName: "Acme Records",
      },
    ]);

    await expect(
      service.getRevenueReport({
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T00:00:00.000Z",
      }),
    ).resolves.toEqual({
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T00:00:00.000Z",
      totalRevenue: 330,
      invoiceCount: 1,
      dailyBreakdown: [
        {
          date: "2026-07-03",
          revenue: 330,
          invoiceCount: 1,
        },
      ],
    });
  });

  it("computes utilization from completed session durations", async () => {
    repository.findStudios.mockResolvedValue([
      { id: "studio-1", name: "Downtown Studio" },
    ]);
    repository.findCompletedSessionsInRange.mockResolvedValue([
      {
        id: "session-1",
        studioId: "studio-1",
        clientId: "client-1",
        startedAt: new Date("2026-07-03T10:00:00.000Z"),
        endedAt: new Date("2026-07-03T12:00:00.000Z"),
        studioName: "Downtown Studio",
      },
    ]);

    await expect(
      service.getUtilizationReport({
        from: "2026-07-03T00:00:00.000Z",
        to: "2026-07-04T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({
      overallPercent: 8.3,
      totalUsedMinutes: 120,
      totalAvailableMinutes: 1440,
      byStudio: [
        {
          studioId: "studio-1",
          studioName: "Downtown Studio",
          usedMinutes: 120,
          availableMinutes: 1440,
          utilizationPercent: 8.3,
        },
      ],
    });
  });

  it("builds client activity rows for clients with bookings, sessions, or revenue", async () => {
    repository.findActiveClients.mockResolvedValue([
      { id: "client-1", name: "Acme Records" },
      { id: "client-2", name: "Quiet Client" },
    ]);
    repository.findBookingsInRange.mockResolvedValue([
      { id: "booking-1", clientId: "client-1" },
    ]);
    repository.findSessionsInRange.mockResolvedValue([
      { id: "session-1", clientId: "client-1" },
    ]);
    repository.findPaidInvoicesInRange.mockResolvedValue([
      {
        id: "invoice-1",
        clientId: "client-1",
        total: 330,
        paidAt: new Date("2026-07-03T12:00:00.000Z"),
        number: "000001",
        clientName: "Acme Records",
      },
    ]);

    await expect(
      service.getClientActivityReport({
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({
      clients: [
        {
          clientId: "client-1",
          clientName: "Acme Records",
          bookingCount: 1,
          sessionCount: 1,
          revenue: 330,
        },
      ],
    });
  });

  it("exports revenue CSV with daily rows and total", async () => {
    repository.findPaidInvoicesInRange.mockResolvedValue([
      {
        id: "invoice-1",
        clientId: "client-1",
        total: 330,
        paidAt: new Date("2026-07-03T12:00:00.000Z"),
        number: "000001",
        clientName: "Acme Records",
      },
    ]);

    await expect(
      service.exportRevenueCsv({
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T00:00:00.000Z",
      }),
    ).resolves.toBe(
      "date,revenue,invoiceCount\n2026-07-03,330,1\ntotal,330,1\n",
    );
  });
});

describe("computeUtilization", () => {
  it("returns zero when no studios exist", () => {
    expect(
      computeUtilization(
        [],
        [],
        new Date("2026-07-01T00:00:00.000Z"),
        new Date("2026-07-02T00:00:00.000Z"),
      ),
    ).toEqual({
      overallPercent: 0,
      totalUsedMinutes: 0,
      totalAvailableMinutes: 0,
      byStudio: [],
    });
  });
});

describe("buildRevenueTrend", () => {
  it("fills missing days with zero revenue", () => {
    expect(
      buildRevenueTrend(
        [{ paidAt: new Date("2026-07-02T12:00:00.000Z"), total: 150 }],
        new Date("2026-07-01T00:00:00.000Z"),
        new Date("2026-07-04T00:00:00.000Z"),
      ),
    ).toEqual([
      { date: "2026-07-01", revenue: 0 },
      { date: "2026-07-02", revenue: 150 },
      { date: "2026-07-03", revenue: 0 },
    ]);
  });
});
