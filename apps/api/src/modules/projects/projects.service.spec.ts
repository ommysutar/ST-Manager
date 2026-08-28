import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateProjectInput } from "@st-manager/validation";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { ProjectsRepository } from "./projects.repository";
import { ProjectsService } from "./projects.service";

const actor: AuthenticatedUser = {
  userId: "user-1",
  email: "owner@studio.test",
  role: "owner",
};

const samplePayload = {
  selectedServiceIds: ["svc-1"],
  tasks: [],
  files: [],
  links: [],
  expenses: [],
  sessionIds: [],
  bookingIds: [],
  invoiceIds: [],
};

describe("ProjectsService", () => {
  let service: ProjectsService;
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

    service = new ProjectsService(
      repository as unknown as ProjectsRepository,
      authRepository as unknown as AuthRepository,
    );
  });

  it("creates a project scoped to the actor studio", async () => {
    const project = {
      id: "project-1",
      studioId: "studio-1",
      projectNumber: "PRJ-0001",
      source: "manual" as const,
      inquiryId: null,
      clientId: null,
      projectName: "Album Mix",
      clientName: "Acme Records",
      clientMobile: null,
      clientEmail: null,
      projectCategory: null,
      status: "active",
      assignedEngineer: "",
      planId: null,
      advanceReceived: 0,
      remainingBalance: 0,
      grandTotal: 0,
      notes: null,
      payload: samplePayload,
      deletedAt: null,
      createdAt: new Date("2026-08-28T00:00:00.000Z"),
      updatedAt: new Date("2026-08-28T00:00:00.000Z"),
    };
    repository.create.mockResolvedValue(project);

    await expect(
      service.create(actor, {
        source: "manual",
        projectName: "Album Mix",
        clientName: "Acme Records",
        selectedServiceIds: ["svc-1"],
      } as CreateProjectInput),
    ).resolves.toEqual(project);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        studioId: "studio-1",
        projectName: "Album Mix",
        payload: expect.objectContaining({ selectedServiceIds: ["svc-1"] }),
      }),
    );
  });

  it("lists only the actor studio projects", async () => {
    repository.findMany.mockResolvedValue([]);
    repository.count.mockResolvedValue(8);

    const result = await service.list(actor, { page: 2, pageSize: 5, search: "album" });

    expect(repository.findMany).toHaveBeenCalledWith({
      studioId: "studio-1",
      skip: 5,
      take: 5,
      search: "album",
    });
    expect(repository.count).toHaveBeenCalledWith("studio-1", "album");
    expect(result.meta).toEqual({ page: 2, pageSize: 5, total: 8 });
  });

  it("pullChanges includes tombstones and does not stamp a future cursor", async () => {
    const deletedAt = new Date("2026-08-19T12:00:00.000Z");
    const deleted = {
      id: "project-del",
      studioId: "studio-1",
      projectNumber: "PRJ-0002",
      source: "manual" as const,
      inquiryId: null,
      clientId: null,
      projectName: "Gone",
      clientName: "Former Client",
      clientMobile: null,
      clientEmail: null,
      projectCategory: null,
      status: "cancelled",
      assignedEngineer: "",
      planId: null,
      advanceReceived: 0,
      remainingBalance: 0,
      grandTotal: 0,
      notes: null,
      payload: samplePayload,
      deletedAt,
      createdAt: new Date("2026-08-19T11:00:00.000Z"),
      updatedAt: deletedAt,
    };
    repository.findChangesSince.mockResolvedValue([deleted]);

    const result = await service.pullChanges(actor, {
      since: "2026-08-19T11:30:00.000Z",
    });

    expect(repository.findChangesSince).toHaveBeenCalledWith({
      studioId: "studio-1",
      since: new Date("2026-08-19T11:30:00.000Z"),
      take: expect.any(Number),
    });
    expect(result.data).toEqual([deleted]);
    expect(result.serverTime).toBe(deletedAt.toISOString());
    expect(result.hasMore).toBe(false);
  });

  it("pullChanges ignores a client cursor ahead of server time so deletes are not skipped", async () => {
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

  it("throws when a project is not found in the actor studio", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getById(actor, "missing-project")).rejects.toThrow(
      "Project missing-project not found",
    );
    expect(repository.findById).toHaveBeenCalledWith("missing-project", "studio-1");
  });
});
