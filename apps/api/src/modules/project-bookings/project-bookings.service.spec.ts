import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateProjectBookingInput } from "@st-manager/validation";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { ProjectsRepository } from "../projects/projects.repository";
import { ProjectBookingsRepository } from "./project-bookings.repository";
import { ProjectBookingsService } from "./project-bookings.service";

const actor: AuthenticatedUser = {
  userId: "user-1",
  email: "owner@studio.test",
  role: "owner",
};

const samplePayload = {
  engineerId: null,
  sessionId: null,
  attendanceRecorded: false,
  equipmentIds: [] as string[],
};

describe("ProjectBookingsService", () => {
  let service: ProjectBookingsService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
    findChangesSince: ReturnType<typeof vi.fn>;
    findOccupyingConflict: ReturnType<typeof vi.fn>;
  };
  let projectsRepository: {
    findById: ReturnType<typeof vi.fn>;
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
      findOccupyingConflict: vi.fn().mockResolvedValue(null),
    };
    projectsRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "project-1",
        studioId: "studio-1",
      }),
    };
    authRepository = {
      findById: vi.fn().mockResolvedValue({ id: "user-1", studioId: "studio-1" }),
    };

    service = new ProjectBookingsService(
      repository as unknown as ProjectBookingsRepository,
      projectsRepository as unknown as ProjectsRepository,
      authRepository as unknown as AuthRepository,
    );
  });

  it("creates a project booking scoped to the actor studio", async () => {
    const booking = {
      id: "pb-1",
      studioId: "studio-1",
      projectId: "project-1",
      roomStudioId: "room-a",
      clientId: null,
      bookingFor: "Studio Session",
      notes: "",
      date: "2026-08-28",
      slotId: "slot-1",
      status: "booked" as const,
      clientName: "Acme Records",
      projectName: "Album Mix",
      projectNumber: "PRJ-0001",
      payload: samplePayload,
      deletedAt: null,
      createdAt: new Date("2026-08-28T00:00:00.000Z"),
      updatedAt: new Date("2026-08-28T00:00:00.000Z"),
    };
    repository.create.mockResolvedValue(booking);

    await expect(
      service.create(actor, {
        projectId: "project-1",
        roomStudioId: "room-a",
        bookingFor: "Studio Session",
        date: "2026-08-28",
        slotId: "slot-1",
        clientName: "Acme Records",
        projectName: "Album Mix",
        projectNumber: "PRJ-0001",
      } as CreateProjectBookingInput),
    ).resolves.toEqual(booking);

    expect(projectsRepository.findById).toHaveBeenCalledWith("project-1", "studio-1");
    expect(repository.findOccupyingConflict).toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        studioId: "studio-1",
        projectId: "project-1",
        roomStudioId: "room-a",
      }),
    );
  });

  it("throws SLOT_CONFLICT when the slot is already occupied", async () => {
    repository.findOccupyingConflict.mockResolvedValue({
      id: "existing",
      studioId: "studio-1",
      projectId: "project-2",
      roomStudioId: "room-a",
      clientId: null,
      bookingFor: "Existing",
      notes: "",
      date: "2026-08-28",
      slotId: "slot-1",
      status: "booked",
      clientName: "Other",
      projectName: "Other Project",
      projectNumber: "PRJ-0002",
      payload: samplePayload,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.create(actor, {
        projectId: "project-1",
        roomStudioId: "room-a",
        bookingFor: "Studio Session",
        date: "2026-08-28",
        slotId: "slot-1",
        clientName: "Acme Records",
        projectName: "Album Mix",
        projectNumber: "PRJ-0001",
      } as CreateProjectBookingInput),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("pullChanges includes tombstones when since is omitted", async () => {
    const deletedAt = new Date("2026-08-19T12:00:00.000Z");
    const deleted = {
      id: "pb-del",
      studioId: "studio-1",
      projectId: "project-1",
      roomStudioId: "room-a",
      clientId: null,
      bookingFor: "Gone",
      notes: "",
      date: "2026-08-19",
      slotId: "slot-1",
      status: "cancelled" as const,
      clientName: "Former Client",
      projectName: "Gone Project",
      projectNumber: "PRJ-0002",
      payload: samplePayload,
      deletedAt,
      createdAt: new Date("2026-08-19T11:00:00.000Z"),
      updatedAt: deletedAt,
    };
    repository.findChangesSince.mockResolvedValue([deleted]);

    const result = await service.pullChanges(actor, {});

    expect(repository.findChangesSince).toHaveBeenCalledWith({
      studioId: "studio-1",
      since: undefined,
      take: expect.any(Number),
    });
    expect(result.data).toEqual([deleted]);
    expect(result.hasMore).toBe(false);
  });

  it("pullChanges ignores a client cursor ahead of server time", async () => {
    repository.findChangesSince.mockResolvedValue([]);
    const future = new Date(Date.now() + 60_000).toISOString();

    await service.pullChanges(actor, { since: future });

    expect(repository.findChangesSince).toHaveBeenCalledWith(
      expect.objectContaining({
        studioId: "studio-1",
        since: undefined,
      }),
    );
  });

  it("throws when a project booking is not found in the actor studio", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getById(actor, "missing-booking")).rejects.toThrow(
      "Project booking missing-booking not found",
    );
  });
});
