import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudiosRepository } from "../studios/studios.repository";
import { DashboardService } from "./dashboard.service";

describe("DashboardService", () => {
  let service: DashboardService;
  let repository: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      count: vi.fn(),
      findMany: vi.fn(),
    };

    service = new DashboardService(repository as unknown as StudiosRepository);
  });

  it("aggregates studio KPIs and returns placeholder sections", async () => {
    const studio = {
      id: "studio-1",
      name: "Downtown Studio",
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    };

    repository.count.mockResolvedValue(3);
    repository.findMany.mockResolvedValue([studio]);

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
      todayBookings: [],
      clientCount: 0,
      monthRevenue: 0,
      utilizationPercent: 0,
    });

    expect(repository.findMany).toHaveBeenCalledWith({ skip: 0, take: 5 });
  });

  it("returns empty recent studios when none exist", async () => {
    repository.count.mockResolvedValue(0);
    repository.findMany.mockResolvedValue([]);

    const summary = await service.getSummary();

    expect(summary.studioCount).toBe(0);
    expect(summary.recentStudios).toEqual([]);
    expect(summary.todayBookings).toEqual([]);
  });
});
