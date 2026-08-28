/**
 * Two-device Studio Room sync simulation with INDEPENDENT storage namespaces.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioRoomResponseDto } from "@st-manager/contracts";

import type * as StoreModuleNs from "./store";

type StoreModule = typeof StoreModuleNs;

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
}));

const serverState = vi.hoisted(() => ({
  rooms: [] as StudioRoomResponseDto[],
  nextSeq: 1,
}));

const studioRoomsApiMock = vi.hoisted(() => ({
  createStudioRoom: vi.fn(async (payload: Record<string, unknown>) => {
    const now = new Date().toISOString();
    const created: StudioRoomResponseDto = {
      id: `srv_room_${serverState.nextSeq}`,
      studioId: "studio-shared",
      name: String(payload.name),
      roomName: (payload.roomName as string) || null,
      description: String(payload.description ?? ""),
      color: String(payload.color ?? "#6366f1"),
      active: payload.active !== false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.nextSeq += 1;
    serverState.rooms.push(created);
    return created;
  }),
  listStudioRooms: vi.fn(async () => ({
    data: serverState.rooms.filter((room) => !room.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.rooms.length },
  })),
  pullStudioRoomChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    const records = serverState.rooms.filter((room) => Date.parse(room.updatedAt) > sinceMs);
    return {
      records,
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getStudioRoom: vi.fn(async (id: string) => {
    const found = serverState.rooms.find((room) => room.id === id && !room.deletedAt);
    if (!found) throw new Error("not found");
    return found;
  }),
  deleteStudioRoom: vi.fn(async (id: string) => {
    const found = serverState.rooms.find((room) => room.id === id);
    if (found) {
      found.deletedAt = new Date().toISOString();
      found.updatedAt = found.deletedAt;
    }
  }),
  updateStudioRoom: vi.fn(async (id: string, patch: Record<string, unknown>) => {
    const found = serverState.rooms.find((room) => room.id === id && !room.deletedAt);
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
  studioRoomsApi: studioRoomsApiMock,
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
  name: "Main Room",
  roomName: "Room A",
  description: "Primary recording room",
  color: "#6366f1",
  active: true,
};

describe("two-device studio room sync (independent storage namespaces)", () => {
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
    store.setRoomsStoreSnapshot([]);
    store.hydrateRoomsSnapshotFromCache();
    return fn();
  }

  beforeEach(async () => {
    authState.studioId = "studio-shared";
    serverState.rooms = [];
    serverState.nextSeq = 1;
    deviceAStorage.clear();
    deviceBStorage.clear();
    studioRoomsApiMock.createStudioRoom.mockClear();
    studioRoomsApiMock.listStudioRooms.mockClear();
    studioRoomsApiMock.pullStudioRoomChanges.mockClear();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    installStorage("A");
    vi.resetModules();
    store = await import("./store");
    store.setRoomsStoreSnapshot([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Device A create → Device B pull receives room", async () => {
    const createdOnA = await asDevice("A", async () => {
      const created = await store.createRoomOfflineAware(basePayload);
      store.writeRoomsSyncCursor(new Date(Date.now() - 60_000).toISOString());
      return created;
    });

    expect(createdOnA.name).toBe("Main Room");
    expect(serverState.rooms).toHaveLength(1);

    const onB = await asDevice("B", async () => {
      store.writeRoomsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileRoomsFromApi();
    });
    expect(onB.some((room) => room.name === "Main Room")).toBe(true);
  });

  it("Device B update → Device A reconcile sees change", async () => {
    const created = await asDevice("A", async () => store.createRoomOfflineAware(basePayload));

    await asDevice("B", async () => {
      store.writeRoomsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcileRoomsFromApi();
      const updated = await studioRoomsApiMock.updateStudioRoom(created.id, {
        description: "Updated on B",
      });
      store.setRoomsStoreSnapshot(
        store.getRoomsStoreSnapshot().map((room) =>
          room.id === created.id ? { ...room, description: updated.description } : room,
        ),
      );
    });

    const onA = await asDevice("A", async () => {
      store.writeRoomsSyncCursor("2026-01-01T00:00:00.000Z");
      return store.reconcileRoomsFromApi();
    });
    expect(onA.find((room) => room.id === created.id)?.description).toBe("Updated on B");
  });

  it("Device A delete → Device B tombstone via reconcile", async () => {
    const createdOnA = await asDevice("A", async () => store.createRoomOfflineAware(basePayload));

    await asDevice("B", async () => {
      store.writeRoomsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcileRoomsFromApi();
    });

    await asDevice("A", async () => {
      await studioRoomsApiMock.deleteStudioRoom(createdOnA.id);
      store.setRoomsStoreSnapshot(store.getRoomsStoreSnapshot().filter((room) => room.id !== createdOnA.id));
    });

    const onBAfterDelete = await asDevice("B", async () => {
      store.writeRoomsSyncCursor(new Date(Date.now() + 60_000).toISOString());
      return store.reconcileRoomsFromApi();
    });
    expect(onBAfterDelete.some((room) => room.id === createdOnA.id)).toBe(false);
  });

  it("offline create → reconnect exactly once, remap temp id", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () => store.createRoomOfflineAware(basePayload));
    expect(local.id.startsWith("local_room_")).toBe(true);
    expect(studioRoomsApiMock.createStudioRoom).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    const afterFlush = await asDevice("A", async () => {
      await store.flushPendingRoomMutations();
      await store.flushPendingRoomMutations();
      return store.getRoomsStoreSnapshot();
    });

    expect(studioRoomsApiMock.createStudioRoom).toHaveBeenCalledTimes(1);
    expect(afterFlush.some((room) => room.id === local.id)).toBe(false);
    expect(afterFlush[0]?.id.startsWith("srv_room_")).toBe(true);
  });

  it("two isolated storage namespaces never leak cache rows", async () => {
    await asDevice("A", async () => {
      await store.createRoomOfflineAware(basePayload);
    });

    const onB = await asDevice("B", async () => {
      store.setRoomsStoreSnapshot([]);
      return store.hydrateRoomsSnapshotFromCache();
    });
    expect(onB.some((room) => room.name === "Main Room")).toBe(false);
  });

  it("no cross-studio room leakage between storage namespaces", async () => {
    await asDevice("A", async () => {
      authState.studioId = "studio-a";
      await store.createRoomOfflineAware(basePayload);
    });

    authState.studioId = "studio-b";
    const onB = await asDevice("B", async () => {
      studioRoomsApiMock.listStudioRooms.mockResolvedValueOnce({
        data: [],
        meta: { page: 1, pageSize: 100, total: 0 },
      });
      studioRoomsApiMock.pullStudioRoomChanges.mockResolvedValueOnce({
        records: [],
        serverTime: new Date().toISOString(),
        hasMore: false,
      });
      return store.reconcileRoomsFromApi();
    });
    expect(onB.some((room) => room.name === "Main Room")).toBe(false);
  });
});
