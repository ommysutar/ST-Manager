import { ROUTES } from "@st-manager/constants";
import { describe, expect, it, vi } from "vitest";

import type { HttpClient } from "../client/types";
import { createClientsApi } from "./clients.api";

describe("createClientsApi", () => {
  it("unwraps the create client response envelope", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "client-1",
        name: "Acme Records",
        email: "contact@acme.test",
        phone: null,
        company: "Acme",
        notes: null,
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    });

    const client: HttpClient = {
      get: vi.fn(),
      getText: vi.fn(),
      post,
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const clientsApi = createClientsApi(client);
    const created = await clientsApi.createClient({
      name: "Acme Records",
      email: "contact@acme.test",
      company: "Acme",
    });

    expect(created.name).toBe("Acme Records");
    expect(post).toHaveBeenCalledWith(ROUTES.CLIENTS, {
      name: "Acme Records",
      email: "contact@acme.test",
      phone: "",
      whatsappNumber: "",
      whatsappSameAsPhone: false,
      company: "Acme",
      notes: "",
    });
  });

  it("serializes null optional fields to empty strings on create", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "client-2",
        name: "Jane Client",
        email: null,
        phone: null,
        company: null,
        notes: null,
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    });

    const client: HttpClient = {
      get: vi.fn(),
      getText: vi.fn(),
      post,
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const clientsApi = createClientsApi(client);
    await clientsApi.createClient({
      name: "Jane Client",
      company: null,
      email: null,
      phone: null,
      notes: null,
    });

    expect(post).toHaveBeenCalledWith(ROUTES.CLIENTS, {
      name: "Jane Client",
      email: "",
      phone: "",
      whatsappNumber: "",
      whatsappSameAsPhone: false,
      company: "",
      notes: "",
    });
  });

  it("returns the list clients envelope unchanged", async () => {
    const listResponse = {
      success: true as const,
      data: [],
      meta: { page: 1, pageSize: 20, total: 0 },
    };

    const get = vi.fn().mockResolvedValue(listResponse);
    const client: HttpClient = {
      get,
      getText: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const clientsApi = createClientsApi(client);
    const response = await clientsApi.listClients({ page: 1, pageSize: 20, search: "acme" });

    expect(response).toEqual(listResponse);
    expect(get).toHaveBeenCalledWith(ROUTES.CLIENTS, { page: 1, pageSize: 20, search: "acme" });
  });
});
