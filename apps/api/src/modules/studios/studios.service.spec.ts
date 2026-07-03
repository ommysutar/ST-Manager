import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudiosRepository } from "./studios.repository";
import { StudiosService } from "./studios.service";

describe("StudiosService", () => {
  let service: StudiosService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    };

    service = new StudiosService(repository as unknown as StudiosRepository);
  });

  it("creates a studio via the repository", async () => {
    const studio = {
      id: "studio-1",
      name: "Downtown Studio",
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    };
    repository.create.mockResolvedValue(studio);

    await expect(service.create({ name: "Downtown Studio" })).resolves.toEqual(studio);
    expect(repository.create).toHaveBeenCalledWith({ name: "Downtown Studio" });
  });

  it("paginates studio lists using skip/take math", async () => {
    repository.findMany.mockResolvedValue([]);
    repository.count.mockResolvedValue(42);

    const result = await service.list({ page: 3, pageSize: 10 });

    expect(repository.findMany).toHaveBeenCalledWith({ skip: 20, take: 10 });
    expect(result.meta).toEqual({ page: 3, pageSize: 10, total: 42 });
  });
});
