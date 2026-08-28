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

  it("A/B/C: A delete → B tombstone via changes + presence; reload and repeated reconcile do not resurrect", async () => {
    const createdOnA = await asDevice("A", async () => {
      const created = await store.createClientOfflineAware({
        name: "Tombstone Twin",
        phone: "+19995550999",
        whatsappNumber: "+19995550999",
        whatsappSameAsPhone: true,
        email: "tomb@qa.test",
        company: "",
        notes: "",
      });
      return created;
    });

    await asDevice("B", async () => {
      store.writeClientsSyncCursor("2026-01-01T00:00:00.000Z");
      const next = await store.reconcileClientsFromApi();
      expect(next.some((c) => c.id === createdOnA.id)).toBe(true);
    });

    await asDevice("A", async () => {
      await clientsApiMock.deleteClient(createdOnA.id);
      store.removeClientFromSnapshot(createdOnA.id);
    });

    const onBAfterDelete = await asDevice("B", async () => {
      // Future cursor would skip /changes; presence list must still drop the row.
      store.writeClientsSyncCursor(new Date(Date.now() + 60_000).toISOString());
      return store.reconcileClientsFromApi();
    });
    expect(onBAfterDelete.some((c) => c.id === createdOnA.id)).toBe(false);

    const afterReload = await asDevice("B", async () => {
      store.setClientsSnapshot([]);
      return store.hydrateClientsSnapshotFromCache();
    });
    expect(afterReload.some((c) => c.id === createdOnA.id)).toBe(false);

    for (let i = 0; i < 3; i += 1) {
      const again = await asDevice("B", async () => store.reconcileClientsFromApi());
      expect(again.some((c) => c.id === createdOnA.id)).toBe(false);
    }
    expect(serverState.clients.filter((c) => !c.deletedAt)).toHaveLength(0);
  });

  it("D/E/F/G: offline create → reconnect exactly once, remap temp id, keep server displayNumber, retry is idempotent", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () =>
      store.createClientOfflineAware({
        name: "Offline Twin",
        phone: "+19995550888",
        whatsappNumber: "",
        whatsappSameAsPhone: false,
        email: "off@qa.test",
        company: "",
        notes: "",
      }),
    );
    expect(local.id.startsWith("local_cli_")).toBe(true);
    expect(local.displayNumber).toBe("");
    expect(clientsApiMock.createClient).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    const afterFlush = await asDevice("A", async () => {
      await store.flushPendingClientCreates();
      await store.flushPendingClientCreates();
      return store.getClientsSnapshot();
    });

    expect(clientsApiMock.createClient).toHaveBeenCalledTimes(1);
    expect(afterFlush.some((c) => c.id === local.id)).toBe(false);
    expect(afterFlush).toHaveLength(1);
    expect(afterFlush[0]?.displayNumber).toBe("CL-0001");
    expect(afterFlush[0]?.id.startsWith("srv_")).toBe(true);
    expect(serverState.clients.filter((c) => !c.deletedAt)).toHaveLength(1);
  });

  it("H: two isolated storage namespaces never leak cache rows", async () => {
    await asDevice("A", async () => {
      await store.createClientOfflineAware({
        name: "Only On A",
        phone: "+12222222222",
        whatsappNumber: "",
        whatsappSameAsPhone: false,
        email: "only-a@test",
        company: "",
        notes: "",
      });
    });

    const onB = await asDevice("B", async () => {
      store.setClientsSnapshot([]);
      return store.hydrateClientsSnapshotFromCache();
    });
    expect(onB.some((c) => c.name === "Only On A")).toBe(false);
  });

  it("I: LWW still prefers the newer updatedAt across devices", async () => {
    const created = await asDevice("A", async () =>
      store.createClientOfflineAware({
        name: "LWW Twin",
        phone: "+13333333333",
        whatsappNumber: "",
        whatsappSameAsPhone: false,
        email: "lww@test",
        company: "Old",
        notes: "",
      }),
    );

    await asDevice("B", async () => {
      store.writeClientsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcileClientsFromApi();
      const newer = await clientsApiMock.updateClient(created.id, { company: "From B" });
      store.upsertClientInSnapshot(newer);
    });

    const onA = await asDevice("A", async () => {
      store.writeClientsSyncCursor("2026-01-01T00:00:00.000Z");
      return store.reconcileClientsFromApi();
    });
    expect(onA.find((c) => c.id === created.id)?.company).toBe("From B");
  });

  it("J: studio isolation still holds after reconcile", async () => {
    await asDevice("A", async () => {
      authState.studioId = "studio-a";
      await store.createClientOfflineAware({
        name: "Studio A Client",
        phone: "+14444444444",
        whatsappNumber: "",
        whatsappSameAsPhone: false,
        email: "sa@test",
        company: "",
        notes: "",
      });
    });

    authState.studioId = "studio-b";
    const onB = await asDevice("B", async () => {
      clientsApiMock.listClients.mockResolvedValueOnce({
        data: [],
        meta: { page: 1, pageSize: 100, total: 0 },
      });
      clientsApiMock.pullClientChanges.mockResolvedValueOnce({
        records: [],
        serverTime: "2026-01-01T00:00:00.000Z",
        hasMore: false,
      });
      return store.reconcileClientsFromApi();
    });
    expect(onB.some((c) => c.name === "Studio A Client")).toBe(false);
  });
});
