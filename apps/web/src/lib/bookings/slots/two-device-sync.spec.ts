/**
 * Two-device Booking Slot Definition sync simulation with INDEPENDENT storage namespaces.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BookingSlotDefinitionResponseDto } from "@st-manager/contracts";

import type * as StoreModuleNs from "./store";

type StoreModule = typeof StoreModuleNs;

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
}));

const serverState = vi.hoisted(() => ({
  slots: [] as BookingSlotDefinitionResponseDto[],
  nextSeq: 1,
}));

const bookingSlotDefinitionsApiMock = vi.hoisted(() => ({
  createBookingSlotDefinition: vi.fn(async (payload: Record<string, unknown>) => {
    const now = new Date().toISOString();
    const created: BookingSlotDefinitionResponseDto = {
      id: `srv_slot_${serverState.nextSeq}`,
      studioId: "studio-shared",
      label: String(payload.label),
      startHour: Number(payload.startHour),
      startMinute: Number(payload.startMinute ?? 0),
      endHour: Number(payload.endHour),
      endMinute: Number(payload.endMinute ?? 0),
      isCustom: payload.isCustom === true,
      sortOrder: Number(payload.sortOrder ?? 0),
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.nextSeq += 1;
    serverState.slots.push(created);
    return created;
  }),
  listBookingSlotDefinitions: vi.fn(async () => ({
    data: serverState.slots.filter((slot) => !slot.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.slots.length },
  })),
  pullBookingSlotDefinitionChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    const records = serverState.slots.filter((slot) => Date.parse(slot.updatedAt) > sinceMs);
    return {
      records,
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getBookingSlotDefinition: vi.fn(async (id: string) => {
    const found = serverState.slots.find((slot) => slot.id === id && !slot.deletedAt);
    if (!found) throw new Error("not found");
    return found;
  }),
  deleteBookingSlotDefinition: vi.fn(async (id: string) => {
    const found = serverState.slots.find((slot) => slot.id === id);
    if (found) {
      found.deletedAt = new Date().toISOString();
      found.updatedAt = found.deletedAt;
    }
  }),
  updateBookingSlotDefinition: vi.fn(async (id: string, patch: Record<string, unknown>) => {
    const found = serverState.slots.find((slot) => slot.id === id && !slot.deletedAt);
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
  bookingSlotDefinitionsApi: bookingSlotDefinitionsApiMock,
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
  label: "Morning Slot",
  startHour: 9,
  startMinute: 0,
  endHour: 12,
  endMinute: 0,
  isCustom: false,
  sortOrder: 0,
};

describe("two-device booking slot sync (independent storage namespaces)", () => {
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
    store.setSlotsStoreSnapshot([]);
    store.hydrateSlotsSnapshotFromCache();
    return fn();
  }

  beforeEach(async () => {
    authState.studioId = "studio-shared";
    serverState.slots = [];
    serverState.nextSeq = 1;
    deviceAStorage.clear();
    deviceBStorage.clear();
    bookingSlotDefinitionsApiMock.createBookingSlotDefinition.mockClear();
    bookingSlotDefinitionsApiMock.listBookingSlotDefinitions.mockClear();
    bookingSlotDefinitionsApiMock.pullBookingSlotDefinitionChanges.mockClear();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    installStorage("A");
    vi.resetModules();
    store = await import("./store");
    store.setSlotsStoreSnapshot([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Device A create → Device B pull receives slot", async () => {
    const createdOnA = await asDevice("A", async () => {
      const created = await store.createSlotOfflineAware(basePayload);
      store.writeSlotsSyncCursor(new Date(Date.now() - 60_000).toISOString());
      return created;
    });

    expect(createdOnA.label).toBe("Morning Slot");
    expect(serverState.slots).toHaveLength(1);

    const onB = await asDevice("B", async () => {
      store.writeSlotsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileSlotsFromApi();
    });
    expect(onB.some((slot) => slot.label === "Morning Slot")).toBe(true);
  });

  it("Device B update → Device A reconcile sees change", async () => {
    const created = await asDevice("A", async () => store.createSlotOfflineAware(basePayload));

    await asDevice("B", async () => {
      store.writeSlotsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcileSlotsFromApi();
      await bookingSlotDefinitionsApiMock.updateBookingSlotDefinition(created.id, {
        label: "Updated Slot",
      });
    });

    const onA = await asDevice("A", async () => {
      store.writeSlotsSyncCursor("2026-01-01T00:00:00.000Z");
      return store.reconcileSlotsFromApi();
    });
    expect(onA.find((slot) => slot.id === created.id)?.label).toBe("Updated Slot");
  });

  it("Device A delete → Device B tombstone via reconcile", async () => {
    const createdOnA = await asDevice("A", async () => store.createSlotOfflineAware(basePayload));

    await asDevice("B", async () => {
      store.writeSlotsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcileSlotsFromApi();
    });

    await asDevice("A", async () => {
      await bookingSlotDefinitionsApiMock.deleteBookingSlotDefinition(createdOnA.id);
      store.setSlotsStoreSnapshot(store.getSlotsStoreSnapshot().filter((slot) => slot.id !== createdOnA.id));
    });

    const onBAfterDelete = await asDevice("B", async () => {
      store.writeSlotsSyncCursor(new Date(Date.now() + 60_000).toISOString());
      return store.reconcileSlotsFromApi();
    });
    expect(onBAfterDelete.some((slot) => slot.id === createdOnA.id)).toBe(false);
  });

  it("offline create → reconnect exactly once, remap temp id", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () => store.createSlotOfflineAware(basePayload));
    expect(local.id.startsWith("local_slot_")).toBe(true);
    expect(bookingSlotDefinitionsApiMock.createBookingSlotDefinition).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    const afterFlush = await asDevice("A", async () => {
      await store.flushPendingSlotMutations();
      await store.flushPendingSlotMutations();
      return store.getSlotsStoreSnapshot();
    });

    expect(bookingSlotDefinitionsApiMock.createBookingSlotDefinition).toHaveBeenCalledTimes(1);
    expect(afterFlush.some((slot) => slot.id === local.id)).toBe(false);
    expect(afterFlush[0]?.id.startsWith("srv_slot_")).toBe(true);
  });

  it("two isolated storage namespaces never leak cache rows", async () => {
    await asDevice("A", async () => {
      await store.createSlotOfflineAware(basePayload);
    });

    const onB = await asDevice("B", async () => {
      store.setSlotsStoreSnapshot([]);
      return store.hydrateSlotsSnapshotFromCache();
    });
    expect(onB.some((slot) => slot.label === "Morning Slot")).toBe(false);
  });

  it("no cross-studio slot leakage between storage namespaces", async () => {
    await asDevice("A", async () => {
      authState.studioId = "studio-a";
      await store.createSlotOfflineAware(basePayload);
    });

    authState.studioId = "studio-b";
    bookingSlotDefinitionsApiMock.listBookingSlotDefinitions.mockImplementation(async () => ({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0 },
    }));
    bookingSlotDefinitionsApiMock.pullBookingSlotDefinitionChanges.mockImplementation(async () => ({
      records: [],
      serverTime: new Date().toISOString(),
      hasMore: false,
    }));

    const onB = await asDevice("B", async () => {
      return store.reconcileSlotsFromApi();
    });
    expect(onB.some((slot) => slot.label === "Morning Slot")).toBe(false);
  });
});
