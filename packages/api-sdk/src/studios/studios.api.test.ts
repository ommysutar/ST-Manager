import { ROUTES } from "@st-manager/constants";
import { describe, expect, it, vi } from "vitest";

import type { HttpClient } from "../client/types";
import { createStudiosApi } from "./studios.api";

describe("createStudiosApi", () => {
  it("unwraps the create studio response envelope", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "studio-1",
        name: "Downtown Studio",
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    });

    const client: HttpClient = {
      get: vi.fn(),
      post,
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const studiosApi = createStudiosApi(client);
    const studio = await studiosApi.createStudio({ name: "Downtown Studio" });

    expect(studio.name).toBe("Downtown Studio");
    expect(post).toHaveBeenCalledWith(`${ROUTES.STUDIOS}`, { name: "Downtown Studio" });
  });

  it("returns the list studios envelope unchanged", async () => {
    const listResponse = {
      success: true as const,
      data: [],
      meta: { page: 1, pageSize: 20, total: 0 },
    };

    const get = vi.fn().mockResolvedValue(listResponse);
    const client: HttpClient = {
      get,
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const studiosApi = createStudiosApi(client);
    const response = await studiosApi.listStudios({ page: 1, pageSize: 20 });

    expect(response).toEqual(listResponse);
    expect(get).toHaveBeenCalledWith(ROUTES.STUDIOS, { page: 1, pageSize: 20 });
  });
});
