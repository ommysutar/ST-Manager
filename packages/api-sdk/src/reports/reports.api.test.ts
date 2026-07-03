import { ROUTES } from "@st-manager/constants";
import type {
  ClientActivityReportResponseDto,
  RevenueReportResponseDto,
  UtilizationReportResponseDto,
} from "@st-manager/contracts";
import { describe, expect, it, vi } from "vitest";

import type { HttpClient } from "../client/types";
import { createReportsApi } from "./reports.api";

describe("createReportsApi", () => {
  it("loads revenue and utilization reports with date range query params", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          from: "2026-07-01T00:00:00.000Z",
          to: "2026-07-31T00:00:00.000Z",
          totalRevenue: 330,
          invoiceCount: 1,
          dailyBreakdown: [],
        },
      } satisfies RevenueReportResponseDto)
      .mockResolvedValueOnce({
        success: true,
        data: {
          from: "2026-07-01T00:00:00.000Z",
          to: "2026-07-31T00:00:00.000Z",
          overallPercent: 25,
          totalUsedMinutes: 120,
          totalAvailableMinutes: 480,
          byStudio: [],
        },
      } satisfies UtilizationReportResponseDto);

    const getText = vi.fn().mockResolvedValue("date,revenue,invoiceCount\n");

    const client: HttpClient = {
      get,
      getText,
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const reportsApi = createReportsApi(client);

    await expect(
      reportsApi.getRevenueReport({
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({ totalRevenue: 330 });

    await expect(
      reportsApi.getUtilizationReport({
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({ overallPercent: 25 });

    expect(get).toHaveBeenCalledWith(`${ROUTES.REPORTS}/revenue`, {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T00:00:00.000Z",
    });
    expect(get).toHaveBeenCalledWith(`${ROUTES.REPORTS}/utilization`, {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T00:00:00.000Z",
    });

    await reportsApi.getRevenueCsv({
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T00:00:00.000Z",
    });

    expect(getText).toHaveBeenCalledWith(`${ROUTES.REPORTS}/revenue/export`, {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-31T00:00:00.000Z",
    });
  });

  it("loads client activity report", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: {
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T00:00:00.000Z",
        clients: [
          {
            clientId: "client-1",
            clientName: "Acme Records",
            bookingCount: 2,
            sessionCount: 1,
            revenue: 330,
          },
        ],
      },
    } satisfies ClientActivityReportResponseDto);

    const client: HttpClient = {
      get,
      getText: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const reportsApi = createReportsApi(client);

    await expect(
      reportsApi.getClientActivityReport({
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({
      clients: [{ clientName: "Acme Records", revenue: 330 }],
    });
  });
});
