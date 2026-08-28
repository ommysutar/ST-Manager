import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateStudioServiceInput } from "@st-manager/validation";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { StudioServicesRepository } from "./studio-services.repository";
import { StudioServicesService } from "./studio-services.service";

const actor: AuthenticatedUser = {
  userId: "user-1",
  email: "owner@studio.test",
  role: "owner",
};

describe("StudioServicesService", () => {
  let service: StudioServicesService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
    findChangesSince: ReturnType<typeof vi.fn>;
  };
  let authRepository: {
    findById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      findChangesSince: vi.fn(),
    };
    authRepository = {
      findById: vi.fn().mockResolvedValue({ id: "user-1", studioId: "studio-1" }),
    };

    service = new StudioServicesService(
      repository as unknown as StudioServicesRepository,
      authRepository as unknown as AuthRepository,
    );
  });

  it("creates a studio service scoped to the actor studio", async () => {
    const row = {
      id: "service-1",
      studioId: "studio-1",
      name: "Recording",
      category: "Audio",
      description: "",
      active: true,
      mandatory: false,
      isStudioRent: false,
      sortOrder: 0,
      legacyPrice: 5000,
      prices: { basic: 4000, standard: 5000, premium: 7000 },
      deletedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    repository.create.mockResolvedValue(row);

    const result = await service.create(actor, {
      name: "Recording",
      prices: { basic: 4000, standard: 5000, premium: 7000 },
    } as CreateStudioServiceInput);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        studioId: "studio-1",
        name: "Recording",
      }),
    );
    expect(result).toEqual(row);
  });

  it("pulls changes with pagination metadata", async () => {
    const rows = [
      {
        id: "service-1",
        studioId: "studio-1",
        name: "Recording",
        category: "",
        description: "",
        active: true,
        mandatory: false,
        isStudioRent: false,
        sortOrder: 0,
        legacyPrice: 0,
        prices: { basic: 0, standard: 0, premium: 0 },
        deletedAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ];
    repository.findChangesSince.mockResolvedValue(rows);

    const result = await service.pullChanges(actor, { since: "2026-01-01T00:00:00.000Z" });

    expect(repository.findChangesSince).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.hasMore).toBe(false);
    expect(result.serverTime).toBe("2026-01-02T00:00:00.000Z");
  });
});
