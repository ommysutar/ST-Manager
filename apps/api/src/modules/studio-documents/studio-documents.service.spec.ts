import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateStudioDocumentInput } from "@st-manager/validation";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { ProjectsRepository } from "../projects/projects.repository";
import { StudioDocumentsRepository } from "./studio-documents.repository";
import { StudioDocumentsService } from "./studio-documents.service";

const actor: AuthenticatedUser = {
  userId: "user-1",
  email: "owner@studio.test",
  role: "owner",
};

describe("StudioDocumentsService", () => {
  let service: StudioDocumentsService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
    findChangesSince: ReturnType<typeof vi.fn>;
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

    service = new StudioDocumentsService(
      repository as unknown as StudioDocumentsRepository,
      projectsRepository as unknown as ProjectsRepository,
      authRepository as unknown as AuthRepository,
    );
  });

  it("creates a studio document scoped to the actor studio", async () => {
    const document = {
      id: "doc-1",
      studioId: "studio-1",
      type: "quotation" as const,
      documentNumber: "QTN-0001",
      inquiryId: "inquiry-1",
      projectId: "project-1",
      paymentId: null,
      snapshot: null,
      deletedAt: null,
      createdAt: new Date("2026-08-28T00:00:00.000Z"),
      updatedAt: new Date("2026-08-28T00:00:00.000Z"),
    };
    repository.create.mockResolvedValue(document);

    await expect(
      service.create(actor, {
        type: "quotation",
        inquiryId: "inquiry-1",
        projectId: "project-1",
      } as CreateStudioDocumentInput),
    ).resolves.toEqual(document);

    expect(projectsRepository.findById).toHaveBeenCalledWith("project-1", "studio-1");
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        studioId: "studio-1",
        type: "quotation",
        inquiryId: "inquiry-1",
        projectId: "project-1",
      }),
    );
  });

  it("pullChanges includes tombstones when since is omitted", async () => {
    const deletedAt = new Date("2026-08-19T12:00:00.000Z");
    const deleted = {
      id: "doc-del",
      studioId: "studio-1",
      type: "invoice" as const,
      documentNumber: "INV-0001",
      inquiryId: null,
      projectId: "project-1",
      paymentId: null,
      snapshot: null,
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

  it("throws when a studio document is not found in the actor studio", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getById(actor, "missing-document")).rejects.toThrow(
      "Studio document missing-document not found",
    );
  });

  it("throws when project does not belong to the actor studio", async () => {
    projectsRepository.findById.mockResolvedValue(null);

    await expect(
      service.create(actor, {
        type: "invoice",
        projectId: "other-project",
      } as CreateStudioDocumentInput),
    ).rejects.toThrow("Project other-project not found");
  });
});
