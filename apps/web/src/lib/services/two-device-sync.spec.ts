/**
 * Two-device Studio Service sync simulation with INDEPENDENT storage namespaces.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioServiceResponseDto } from "@st-manager/contracts";

import type * as StoreModuleNs from "./store";

type StoreModule = typeof StoreModuleNs;

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
}));

const serverState = vi.hoisted(() => ({
  services: [] as StudioServiceResponseDto[],
  nextSeq: 1,
}));

const studioServicesApiMock = vi.hoisted(() => ({
  createStudioService: vi.fn(async (payload: Record<string, unknown>) => {
    const now = new Date().toISOString();
    const prices = payload.prices as { basic: number; standard: number; premium: number };
    const created: StudioServiceResponseDto = {
      id: `srv_svc_${serverState.nextSeq}`,
      studioId: "studio-shared",
      name: String(payload.name),
      category: String(payload.category ?? ""),
      description: String(payload.description ?? ""),
      active: payload.active !== false,
      mandatory: payload.mandatory === true,
      isStudioRent: payload.isStudioRent === true,
      sortOrder: Number(payload.sortOrder ?? 0),
      legacyPrice: prices.standard,
      prices,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.nextSeq += 1;
    serverState.services.push(created);
    return created;
  }),
  listStudioServices: vi.fn(async () => ({
    data: serverState.services.filter((service) => !service.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.services.length },
  })),
  pullStudioServiceChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    const records = serverState.services.filter(
      (service) => Date.parse(service.updatedAt) > sinceMs,
    );
    return {
      records,
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getStudioService: vi.fn(async (id: string) => {
    const found = serverState.services.find((service) => service.id === id && !service.deletedAt);
    if (!found) throw new Error("not found");
    return found;
  }),
  deleteStudioService: vi.fn(async (id: string) => {
    const found = serverState.services.find((service) => service.id === id);
    if (found) {
      found.deletedAt = new Date().toISOString();
      found.updatedAt = found.deletedAt;
    }
  }),
  updateStudioService: vi.fn(async (id: string, patch: Record<string, unknown>) => {
    const found = serverState.services.find((service) => service.id === id && !service.deletedAt);
    if (!found) throw new Error("not found");
    Object.assign(found, patch, { updatedAt: new Date().toISOString() });
    return { ...found };
  }),
}));

vi.mock("@/lib/token-store", () => ({
  getAuthUserSnapshot: () =>
    authState.studioId
      ? {
          id: "user-1",
          email: "owner@studio.test",
          role: "owner",
          studioId: authState.studioId,
        }
      : null,
  tokenStore: {
    getAccessToken: () => "token",
  },
}));

vi.mock("@/lib/api-client", () => ({
  studioServicesApi: studioServicesApiMock,
}));

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

const basePayload = {
  name: "Mixing",
  category: "Audio",
  description: "Track mixing",
  active: true,
  mandatory: false,
  isStudioRent: false,
  sortOrder: 0,
  legacyPrice: 3000,
  prices: { basic: 2400, standard: 3000, premium: 4500 },
};

describe("two-device studio service sync (independent storage namespaces)", () => {
  const deviceAStorage = new MemoryStorage();
  const deviceBStorage = new MemoryStorage();
  let store: StoreModule;

  function installStorage(device: "A" | "B") {
    const storage = device === "A" ? deviceAStorage : deviceBStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
  }

  async function asDevice<T>(device: "A" | "B", fn: () => Promise<T> | T): Promise<T> {
    installStorage(device);
    store.setServicesStoreSnapshot([]);
    store.hydrateServicesSnapshotFromCache();
    return fn();
  }

  beforeEach(async () => {
    authState.studioId = "studio-shared";
    serverState.services = [];
    serverState.nextSeq = 1;
    deviceAStorage.clear();
    deviceBStorage.clear();
    studioServicesApiMock.createStudioService.mockClear();
    studioServicesApiMock.listStudioServices.mockClear();
    studioServicesApiMock.pullStudioServiceChanges.mockClear();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    installStorage("A");
    vi.resetModules();
    store = await import("./store");
    store.setServicesStoreSnapshot([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Device A create → Device B pull receives service", async () => {
    const createdOnA = await asDevice("A", async () => {
      const created = await store.createServiceOfflineAware(basePayload);
      store.writeServicesSyncCursor(new Date(Date.now() - 60_000).toISOString());
      return created;
    });

    expect(createdOnA.name).toBe("Mixing");
    expect(serverState.services).toHaveLength(1);

    const onB = await asDevice("B", async () => {
      store.writeServicesSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileServicesFromApi();
    });
    expect(onB.some((service) => service.name === "Mixing")).toBe(true);
  });

  it("offline create → reconnect exactly once, remap temp id", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () => store.createServiceOfflineAware(basePayload));
    expect(local.id.startsWith("local_svc_")).toBe(true);
    expect(studioServicesApiMock.createStudioService).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    const afterFlush = await asDevice("A", async () => {
      await store.flushPendingServiceMutations();
      await store.flushPendingServiceMutations();
      return store.getServicesStoreSnapshot();
    });

    expect(studioServicesApiMock.createStudioService).toHaveBeenCalledTimes(1);
    expect(afterFlush.some((service) => service.id === local.id)).toBe(false);
    expect(afterFlush).toHaveLength(1);
    expect(afterFlush[0]?.id.startsWith("srv_svc_")).toBe(true);
  });

  it("two isolated storage namespaces never leak cache rows", async () => {
    await asDevice("A", async () => {
      await store.createServiceOfflineAware(basePayload);
    });

    const onB = await asDevice("B", async () => {
      store.setServicesStoreSnapshot([]);
      return store.hydrateServicesSnapshotFromCache();
    });
    expect(onB.some((service) => service.name === "Mixing")).toBe(false);
  });
});
