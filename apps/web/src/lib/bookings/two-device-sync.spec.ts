/**
 * Two-device Project Booking sync simulation with INDEPENDENT storage namespaces.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectBookingResponseDto } from "@st-manager/contracts";

import type * as StoreModuleNs from "./store";

type StoreModule = typeof StoreModuleNs;

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
}));

const serverState = vi.hoisted(() => ({
  bookings: [] as ProjectBookingResponseDto[],
  nextSeq: 1,
}));

const OCCUPYING = ["draft", "booked", "completed"] as const;

function occupies(status: string): boolean {
  return OCCUPYING.includes(status as (typeof OCCUPYING)[number]);
}

const projectBookingsApiMock = vi.hoisted(() => ({
  createProjectBooking: vi.fn(async (payload: Record<string, string>) => {
    const conflict = serverState.bookings.find(
      (booking) =>
        !booking.deletedAt &&
        occupies(booking.status) &&
        occupies(String(payload.status ?? "booked")) &&
        booking.roomStudioId === payload.roomStudioId &&
        booking.date === payload.date &&
        booking.slotId === payload.slotId,
    );
    if (conflict) {
      const error = new Error("Studio already booked.") as Error & { code?: string };
      error.code = "SLOT_CONFLICT";
      throw error;
    }

    const now = new Date().toISOString();
    const created: ProjectBookingResponseDto = {
      id: `srv_bkg_${serverState.nextSeq}`,
      studioId: "studio-shared",
      projectId: payload.projectId,
      roomStudioId: payload.roomStudioId,
      clientId: null,
      bookingFor: payload.bookingFor,
      notes: payload.notes ?? "",
      date: payload.date,
      slotId: payload.slotId,
      status: (payload.status ?? "booked") as ProjectBookingResponseDto["status"],
      clientName: payload.clientName,
      projectName: payload.projectName,
      projectNumber: payload.projectNumber ?? "",
      engineerId: null,
      sessionId: null,
      attendanceRecorded: false,
      equipmentIds: [],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.nextSeq += 1;
    serverState.bookings.push(created);
    return created;
  }),
  listProjectBookings: vi.fn(async () => ({
    data: serverState.bookings.filter((booking) => !booking.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.bookings.length },
  })),
  pullProjectBookingChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    const records = serverState.bookings.filter(
      (booking) => Date.parse(booking.updatedAt) > sinceMs,
    );
    return {
      records,
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getProjectBooking: vi.fn(async (id: string) => {
    const found = serverState.bookings.find((booking) => booking.id === id && !booking.deletedAt);
    if (!found) throw new Error("not found");
    return found;
  }),
  deleteProjectBooking: vi.fn(async (id: string) => {
    const found = serverState.bookings.find((booking) => booking.id === id);
    if (found) {
      found.deletedAt = new Date().toISOString();
      found.updatedAt = found.deletedAt;
    }
  }),
  updateProjectBooking: vi.fn(async (id: string, patch: Record<string, string>) => {
    const found = serverState.bookings.find((booking) => booking.id === id && !booking.deletedAt);
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
  projectBookingsApi: projectBookingsApiMock,
}));

vi.mock("@st-manager/api-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@st-manager/api-sdk")>();
  return actual;
});

vi.mock("@/lib/projects/storage", () => ({
  getProject: vi.fn((id: string) => ({
    id,
    clientName: "Sync Client",
    projectName: "Sync Project",
    projectNumber: "PRJ-0001",
    bookingIds: [] as string[],
  })),
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

const basePayload = {
  projectId: "project-1",
  roomStudioId: "room-a",
  bookingFor: "Studio Session",
  notes: "",
  date: "2026-08-28",
  slotId: "slot-1",
  status: "booked" as const,
  clientName: "Sync Client",
  projectName: "Sync Project",
  projectNumber: "PRJ-0001",
};

describe("two-device project booking sync (independent storage namespaces)", () => {
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
    store.setBookingsStoreSnapshot([]);
    store.hydrateBookingsSnapshotFromCache();
    return fn();
  }

  beforeEach(async () => {
    authState.studioId = "studio-shared";
    serverState.bookings = [];
    serverState.nextSeq = 1;
    deviceAStorage.clear();
    deviceBStorage.clear();
    projectBookingsApiMock.createProjectBooking.mockClear();
    projectBookingsApiMock.listProjectBookings.mockClear();
    projectBookingsApiMock.pullProjectBookingChanges.mockClear();
    projectBookingsApiMock.updateProjectBooking.mockClear();
    projectBookingsApiMock.deleteProjectBooking.mockClear();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    installStorage("A");
    vi.resetModules();
    store = await import("./store");
    store.setBookingsStoreSnapshot([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("11: Device A create → Device B pull receives booking", async () => {
    const createdOnA = await asDevice("A", async () => {
      const created = await store.createProjectBookingOfflineAware(basePayload);
      store.writeProjectBookingsSyncCursor(new Date(Date.now() - 60_000).toISOString());
      return created;
    });

    expect(createdOnA.studioId).toBe("room-a");
    expect(serverState.bookings).toHaveLength(1);

    const onB = await asDevice("B", async () => {
      store.writeProjectBookingsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileProjectBookingsFromApi();
    });
    expect(onB.filter((booking) => booking.id === createdOnA.id)).toHaveLength(1);
  });

  it("12: Device B update → Device A pull receives update", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createProjectBookingOfflineAware(basePayload),
    );

    await asDevice("B", async () => {
      store.writeProjectBookingsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      await store.reconcileProjectBookingsFromApi();
      const updated = await projectBookingsApiMock.updateProjectBooking(createdOnA.id, {
        notes: "Edited On B",
      });
      store.upsertBookingInSnapshot((await import("./map-dto")).dtoToProjectBooking(updated));
    });

    const onAAfterUpdate = await asDevice("A", async () => {
      store.writeProjectBookingsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileProjectBookingsFromApi();
    });
    expect(onAAfterUpdate.find((booking) => booking.id === createdOnA.id)?.notes).toBe(
      "Edited On B",
    );
  });

  it("13: Device A delete → Device B tombstone via reconcile", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createProjectBookingOfflineAware(basePayload),
    );

    await asDevice("B", async () => {
      store.writeProjectBookingsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcileProjectBookingsFromApi();
    });

    await asDevice("A", async () => {
      await projectBookingsApiMock.deleteProjectBooking(createdOnA.id);
      store.removeBookingFromSnapshot(createdOnA.id);
    });

    const onBAfterDelete = await asDevice("B", async () => {
      store.writeProjectBookingsSyncCursor(new Date(Date.now() + 60_000).toISOString());
      return store.reconcileProjectBookingsFromApi();
    });
    expect(onBAfterDelete.some((booking) => booking.id === createdOnA.id)).toBe(false);
  });

  it("14: tombstone survives repeated reconcile and reload", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createProjectBookingOfflineAware(basePayload),
    );

    await asDevice("B", async () => {
      store.writeProjectBookingsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcileProjectBookingsFromApi();
    });

    await asDevice("A", async () => {
      await projectBookingsApiMock.deleteProjectBooking(createdOnA.id);
      store.removeBookingFromSnapshot(createdOnA.id);
    });

    for (let i = 0; i < 3; i += 1) {
      const again = await asDevice("B", async () => {
        store.writeProjectBookingsSyncCursor(new Date(Date.now() + 60_000).toISOString());
        return store.reconcileProjectBookingsFromApi();
      });
      expect(again.some((booking) => booking.id === createdOnA.id)).toBe(false);
    }
  });

  it("15: offline create → reconnect exactly once, remap temp id", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () =>
      store.createProjectBookingOfflineAware(basePayload),
    );
    expect(local.id.startsWith("local_bkg_")).toBe(true);
    expect(projectBookingsApiMock.createProjectBooking).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    const afterFlush = await asDevice("A", async () => {
      await store.flushPendingProjectBookingCreates();
      await store.flushPendingProjectBookingCreates();
      return store.getBookingsStoreSnapshot();
    });

    expect(projectBookingsApiMock.createProjectBooking).toHaveBeenCalledTimes(1);
    expect(afterFlush.some((booking) => booking.id === local.id)).toBe(false);
    expect(afterFlush).toHaveLength(1);
    expect(afterFlush[0]?.id.startsWith("srv_bkg_")).toBe(true);
  });

  it("16: two isolated storage namespaces never leak cache rows", async () => {
    await asDevice("A", async () => {
      await store.createProjectBookingOfflineAware(basePayload);
    });

    const onB = await asDevice("B", async () => {
      store.setBookingsStoreSnapshot([]);
      return store.hydrateBookingsSnapshotFromCache();
    });
    expect(onB.some((booking) => booking.projectName === "Sync Project")).toBe(false);
  });

  it("17: server slot conflict on flush marks pending entry with slotConflict", async () => {
    serverState.bookings.push({
      ...basePayload,
      id: "srv_existing",
      studioId: "studio-shared",
      roomStudioId: "room-a",
      clientId: null,
      status: "booked",
      engineerId: null,
      sessionId: null,
      attendanceRecorded: false,
      equipmentIds: [],
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () =>
      store.createProjectBookingOfflineAware(basePayload),
    );
    expect(local.id.startsWith("local_bkg_")).toBe(true);

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    await asDevice("A", async () => {
      const { ApiError } = await import("@st-manager/api-sdk");
      projectBookingsApiMock.createProjectBooking.mockImplementationOnce(async () => {
        throw new ApiError({
          success: false,
          statusCode: 409,
          error: "SLOT_CONFLICT",
          message: "Studio already booked.",
          path: "",
          timestamp: new Date().toISOString(),
        });
      });
      await store.flushPendingProjectBookingCreates();
      const pending = store.listPendingProjectBookingCreates();
      expect(pending.some((entry) => entry.localId === local.id && entry.slotConflict)).toBe(true);
    });
  });

  it("18: roomStudioId maps to web studioId field on reconcile", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createProjectBookingOfflineAware({ ...basePayload, roomStudioId: "room-special" }),
    );
    expect(createdOnA.studioId).toBe("room-special");

    const onB = await asDevice("B", async () => {
      store.writeProjectBookingsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileProjectBookingsFromApi();
    });
    expect(onB.find((booking) => booking.id === createdOnA.id)?.studioId).toBe("room-special");
  });
});
