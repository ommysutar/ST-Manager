import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientsRepository } from "./clients.repository";
import { ClientsService } from "./clients.service";

describe("ClientsService", () => {
  let service: ClientsService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    };

    service = new ClientsService(repository as unknown as ClientsRepository);
  });

  it("creates a client via the repository", async () => {
    const client = {
      id: "client-1",
      name: "Acme Records",
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
      service.create({
        name: "Acme Records",
        email: "contact@acme.test",
        phone: null,
        whatsappNumber: null,
        whatsappSameAsPhone: false,
        company: "Acme",
        notes: null,
      }),
    ).resolves.toEqual(client);
  });

  it("paginates client lists with optional search", async () => {
    repository.findMany.mockResolvedValue([]);
    repository.count.mockResolvedValue(12);

    const result = await service.list({ page: 2, pageSize: 5, search: "acme" });

    expect(repository.findMany).toHaveBeenCalledWith({ skip: 5, take: 5, search: "acme" });
    expect(repository.count).toHaveBeenCalledWith("acme");
    expect(result.meta).toEqual({ page: 2, pageSize: 5, total: 12 });
  });

  it("throws when a client is not found", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getById("missing-client")).rejects.toThrow("Client missing-client not found");
  });

  it("soft deletes an existing client", async () => {
    const client = {
      id: "client-1",
      name: "Acme Records",
      email: null,
      phone: null,
      whatsappNumber: null,
      whatsappSameAsPhone: false,
      company: null,
      notes: null,
      deletedAt: null,
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    };
    repository.findById.mockResolvedValue(client);
    repository.softDelete.mockResolvedValue({ ...client, deletedAt: new Date() });

    await expect(service.softDelete("client-1")).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalledWith("client-1");
  });
});
