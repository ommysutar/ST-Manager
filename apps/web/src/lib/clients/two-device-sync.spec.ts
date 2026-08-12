/**
 * Two-device Client sync simulation with INDEPENDENT storage namespaces.
 * Device A and Device B never share the same localStorage object.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientResponseDto } from "@st-manager/contracts";

import type * as StoreModuleNs from "./store";

type StoreModule = typeof StoreModuleNs;

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
}));

const serverState = vi.hoisted(() => ({
  clients: [] as ClientResponseDto[],
  nextSeq: 1,
}));

const clientsApiMock = vi.hoisted(() => ({
  createClient: vi.fn(async (payload: Record<string, string | boolean>) => {
    const duplicate = serverState.clients.find((client) => {
      if (client.deletedAt) return false;
      const phone = String(payload.phone ?? "").replace(/\D/g, "");
      const email = String(payload.email ?? "")
        .trim()
        .toLowerCase();
      if (phone.length >= 10 && (client.phone ?? "").replace(/\D/g, "") === phone) {
        return true;
      }
      if (email && (client.email ?? "").trim().toLowerCase() === email) {
        return true;
      }
      return false;
    });
    if (duplicate) {
      return duplicate;
    }

    const now = new Date().toISOString();
    const created: ClientResponseDto = {
      id: `srv_${serverState.nextSeq}`,
      studioId: "studio-shared",
      name: String(payload.name),
      displayNumber: `CL-${String(serverState.nextSeq).padStart(4, "0")}`,
      email: (payload.email as string) || null,
      phone: (payload.phone as string) || null,
      whatsappNumber: (payload.whatsappNumber as string) || null,
      whatsappSameAsPhone: Boolean(payload.whatsappSameAsPhone),
      company: (payload.company as string) || null,
      notes: (payload.notes as string) || null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.nextSeq += 1;
    serverState.clients.push(created);
    return created;
  }),
  listClients: vi.fn(async () => ({
    data: serverState.clients.filter((c) => !c.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.clients.length },
  })),
  pullClientChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    const records = serverState.clients.filter((c) => Date.parse(c.updatedAt) > sinceMs);
    return {
      records,
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getClient: vi.fn(async (id: string) => {
    const found = serverState.clients.find((c) => c.id === id && !c.deletedAt);
    if (!found) throw new Error("not found");
    return found;
  }),
  deleteClient: vi.fn(async (id: string) => {
    const found = serverState.clients.find((c) => c.id === id);
    if (found) {
      found.deletedAt = new Date().toISOString();
      found.updatedAt = found.deletedAt;
    }
  }),
  updateClient: vi.fn(async (id: string, patch: Record<string, string | null>) => {
    const found = serverState.clients.find((c) => c.id === id && !c.deletedAt);
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
  clientsApi: clientsApiMock,
}));

vi.mock("@/lib/projects/storage", () => ({
  loadAllProjects: () => [],
  updateProject: vi.fn(),
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

describe("two-device client sync (independent storage namespaces)", () => {
  const deviceAStorage = new MemoryStorage();
  const deviceBStorage = new MemoryStorage();
  let store: StoreModule;
  let activeDevice: "A" | "B" = "A";

  function installStorage(device: "A" | "B") {
    activeDevice = device;
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
    // Reset in-memory module snapshot when switching devices.
    store.setClientsSnapshot([]);
    store.hydrateClientsSnapshotFromCache();
    return fn();
  }

  beforeEach(async () => {
    authState.studioId = "studio-shared";
    serverState.clients = [];
    serverState.nextSeq = 1;
    deviceAStorage.clear();
    deviceBStorage.clear();
    clientsApiMock.createClient.mockClear();
    clientsApiMock.listClients.mockClear();
    clientsApiMock.pullClientChanges.mockClear();
    clientsApiMock.updateClient.mockClear();
    clientsApiMock.deleteClient.mockClear();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    installStorage("A");
    vi.resetModules();
    store = await import("./store");
    store.setClientsSnapshot([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("M: Device A create → Device B pull once; B update → A pull; A delete → B tombstone; no churn", async () => {
    // Device A creates
    const createdOnA = await asDevice("A", async () => {
      const created = await store.createClientOfflineAware({
        name: "QA Sync Twin",
        phone: "+19995550123",
        whatsappNumber: "+19995550123",
        whatsappSameAsPhone: true,
        email: "twin@qa.test",
        company: "A Co",
        notes: "from A",
      });
      store.writeClientsSyncCursor(new Date(Date.now() - 60_000).toISOString());
      return created;
    });

    expect(createdOnA.displayNumber).toBe("CL-0001");
    expect(serverState.clients).toHaveLength(1);

    // Device B pulls — receives exactly once
    const onB = await asDevice("B", async () => {
      store.writeClientsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      const next = await store.reconcileClientsFromApi();
      return next;
    });
    expect(onB.filter((c) => c.id === createdOnA.id)).toHaveLength(1);
    expect(onB[0]?.displayNumber).toBe("CL-0001");

    // Device B updates
    await asDevice("B", async () => {
      const updated = await clientsApiMock.updateClient(createdOnA.id, {
        company: "Edited On B",
      });
      store.upsertClientInSnapshot(updated);
    });

    // Device A pulls update
    const onAAfterUpdate = await asDevice("A", async () => {
      store.writeClientsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileClientsFromApi();
    });
    expect(onAAfterUpdate.find((c) => c.id === createdOnA.id)?.company).toBe("Edited On B");

    // Device A deletes
    await asDevice("A", async () => {
      await clientsApiMock.deleteClient(createdOnA.id);
      store.removeClientFromSnapshot(createdOnA.id);
    });

    // Device B pulls tombstone
    const onBAfterDelete = await asDevice("B", async () => {
      store.writeClientsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileClientsFromApi();
    });
    expect(onBAfterDelete.some((c) => c.id === createdOnA.id)).toBe(false);

    // Repeated reconcile — no duplicates / no resurrection
    for (let i = 0; i < 3; i += 1) {
      const againA = await asDevice("A", async () => {
        store.writeClientsSyncCursor(new Date(Date.now() - 120_000).toISOString());
        return store.reconcileClientsFromApi();
      });
      const againB = await asDevice("B", async () => {
        store.writeClientsSyncCursor(new Date(Date.now() - 120_000).toISOString());
        return store.reconcileClientsFromApi();
      });
      expect(againA.some((c) => c.id === createdOnA.id)).toBe(false);
      expect(againB.some((c) => c.id === createdOnA.id)).toBe(false);
      expect(serverState.clients.filter((c) => !c.deletedAt)).toHaveLength(0);
    }

    expect(activeDevice).toBeTruthy();
  });

  it("N: no cross-studio client leakage between storage namespaces", async () => {
    await asDevice("A", async () => {
      authState.studioId = "studio-a";
      await store.createClientOfflineAware({
        name: "Studio A Only",
        phone: "+11111111111",
        whatsappNumber: "",
        whatsappSameAsPhone: false,
        email: "a@test",
        company: "",
        notes: "",
      });
    });

    // Switch auth + storage to studio B device profile
    authState.studioId = "studio-b";
    const onB = await asDevice("B", async () => {
      store.writeClientsSyncCursor(new Date(Date.now() - 60_000).toISOString());
      // Simulate empty studio B server list
      clientsApiMock.listClients.mockResolvedValueOnce({
        data: [],
        meta: { page: 1, pageSize: 100, total: 0 },
      });
      clientsApiMock.pullClientChanges.mockResolvedValueOnce({
        records: [],
        serverTime: new Date().toISOString(),
        hasMore: false,
      });
      return store.reconcileClientsFromApi();
    });

    expect(onB.some((c) => c.name === "Studio A Only")).toBe(false);
  });
});
