import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { ClientsRepository } from "./clients.repository";
import { ClientsService } from "./clients.service";

const actor: AuthenticatedUser = {
  userId: "user-1",
  email: "owner@studio.test",
  role: "owner",
};

describe("ClientsService", () => {
  let service: ClientsService;
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

    service = new ClientsService(
      repository as unknown as ClientsRepository,
      authRepository as unknown as AuthRepository,
    );
  });

  it("creates a client scoped to the actor studio", async () => {
    const client = {
      id: "client-1",
      studioId: "studio-1",
      name: "Acme Records",
      displayNumber: "CL-0001",
      email: "contact@acme.test",
      phone: null,
      whatsappNumber: null,
      whatsappSameAsPhone: false,
      company: "Acme",
      notes: null,
      deletedAt: null,
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    };
    repository.create.mockResolvedValue(client);

    await expect(
      service.create(actor, {
        name: "Acme Records",
        email: "contact@acme.test",
        phone: null,
        whatsappNumber: null,
        whatsappSameAsPhone: false,
        company: "Acme",
        notes: null,
      }),
    ).resolves.toEqual(client);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ studioId: "studio-1", name: "Acme Records" }),
    );
  });

  it("lists only the actor studio clients", async () => {
    repository.findMany.mockResolvedValue([]);
    repository.count.mockResolvedValue(12);

    const result = await service.list(actor, { page: 2, pageSize: 5, search: "acme" });

    expect(repository.findMany).toHaveBeenCalledWith({
      studioId: "studio-1",
      skip: 5,
      take: 5,
      search: "acme",
    });
    expect(repository.count).toHaveBeenCalledWith("studio-1", "acme");
    expect(result.meta).toEqual({ page: 2, pageSize: 5, total: 12 });
  });

  it("pullChanges includes tombstones and does not stamp a future cursor", async () => {
    const deletedAt = new Date("2026-08-19T12:00:00.000Z");
    const deleted = {
      id: "client-del",
      studioId: "studio-1",
      name: "Gone",
      displayNumber: "CL-0002",
      email: null,
      phone: null,
      whatsappNumber: null,
      whatsappSameAsPhone: false,
      company: null,
      notes: null,
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

  it("throws when a client is not found in the actor studio", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getById(actor, "missing-client")).rejects.toThrow(
      "Client missing-client not found",
    );
    expect(repository.findById).toHaveBeenCalledWith("missing-client", "studio-1");
  });
});
