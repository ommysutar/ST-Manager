import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { StudioSettingsRepository } from "./studio-settings.repository";
import { StudioSettingsService } from "./studio-settings.service";

const actor: AuthenticatedUser = {
  userId: "user-1",
  email: "owner@studio.test",
  role: "owner",
};

describe("StudioSettingsService", () => {
  let service: StudioSettingsService;
  let repository: {
    findOrCreate: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    findChangesSince: ReturnType<typeof vi.fn>;
  };
  let authRepository: {
    findById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findOrCreate: vi.fn(),
      upsert: vi.fn(),
      findChangesSince: vi.fn(),
    };
    authRepository = {
      findById: vi.fn().mockResolvedValue({ id: "user-1", studioId: "studio-1" }),
    };

    service = new StudioSettingsService(
      repository as unknown as StudioSettingsRepository,
      authRepository as unknown as AuthRepository,
    );
  });

  it("returns or creates studio settings for the actor studio", async () => {
    const settings = {
      id: "settings-1",
      studioId: "studio-1",
      profile: {},
      whatsapp: {},
      deletedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    repository.findOrCreate.mockResolvedValue(settings);

    const result = await service.getOrCreate(actor);

    expect(repository.findOrCreate).toHaveBeenCalledWith("studio-1");
    expect(result).toEqual(settings);
  });

  it("upserts studio settings scoped to the actor studio", async () => {
    const settings = {
      id: "settings-1",
      studioId: "studio-1",
      profile: { studioName: "Acme" },
      whatsapp: {},
      deletedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
    repository.upsert.mockResolvedValue(settings);

    const result = await service.upsert(actor, { profile: { studioName: "Acme" } });

    expect(repository.upsert).toHaveBeenCalledWith("studio-1", {
      profile: { studioName: "Acme" },
    });
    expect(result).toEqual(settings);
  });
});
