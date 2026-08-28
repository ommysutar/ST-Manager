import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateBookingSlotDefinitionInput } from "@st-manager/validation";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { BookingSlotDefinitionsRepository } from "./booking-slot-definitions.repository";
import { BookingSlotDefinitionsService } from "./booking-slot-definitions.service";

const actor: AuthenticatedUser = {
  userId: "user-1",
  email: "owner@studio.test",
  role: "owner",
};

describe("BookingSlotDefinitionsService", () => {
  let service: BookingSlotDefinitionsService;
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

    service = new BookingSlotDefinitionsService(
      repository as unknown as BookingSlotDefinitionsRepository,
      authRepository as unknown as AuthRepository,
    );
  });

  it("creates a booking slot definition scoped to the actor studio", async () => {
    const row = {
      id: "slot-1",
      studioId: "studio-1",
      label: "Morning",
      startHour: 9,
      startMinute: 0,
      endHour: 13,
      endMinute: 0,
      isCustom: false,
      sortOrder: 0,
      deletedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    repository.create.mockResolvedValue(row);

    const result = await service.create(actor, {
      label: "Morning",
      startHour: 9,
      endHour: 13,
    } as CreateBookingSlotDefinitionInput);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        studioId: "studio-1",
        label: "Morning",
      }),
    );
    expect(result).toEqual(row);
  });
});
