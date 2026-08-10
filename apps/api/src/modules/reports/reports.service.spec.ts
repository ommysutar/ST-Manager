import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { ReportsRepository } from "./reports.repository";
import { ReportsService, buildRevenueTrend, computeUtilization } from "./reports.service";

const actor: AuthenticatedUser = {
  userId: "user-1",
  email: "owner@studio.test",
  role: "owner",
};

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
  let authRepository: {
    findById: ReturnType<typeof vi.fn>;
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
    authRepository = {
      findById: vi.fn().mockResolvedValue({ id: "user-1", studioId: "studio-1" }),
    };

    service = new ReportsService(
      repository as unknown as ReportsRepository,
      authRepository as unknown as AuthRepository,
    );
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

  it("scopes client activity to the authenticated studio only", async () => {
    repository.findActiveClients.mockResolvedValue([
      { id: "client-1", name: "Acme Records" },
    ]);
    repository.findBookingsInRange.mockResolvedValue([
      { id: "booking-1", clientId: "client-1" },
      { id: "booking-foreign", clientId: "client-other-studio" },
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

    const report = await service.getClientActivityReport(actor, {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T00:00:00.000Z",
    });

    expect(repository.findActiveClients).toHaveBeenCalledWith("studio-1");
    expect(report.clients.map((row) => row.clientId)).toEqual(["client-1"]);
    expect(report.clients.some((row) => row.clientId === "client-other-studio")).toBe(false);
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
    ).resolves.toBe("date,revenue,invoiceCount\n2026-07-03,330,1\ntotal,330,1\n");
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
        [{ paidAt: new Date("2026-07-02T12:00:00.000Z"), total: 100 }],
        new Date("2026-07-01T00:00:00.000Z"),
        new Date("2026-07-03T00:00:00.000Z"),
      ),
    ).toEqual([
      { date: "2026-07-01", revenue: 0 },
      { date: "2026-07-02", revenue: 100 },
    ]);
  });
});
