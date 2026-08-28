/**
 * Two-device Payment sync simulation with INDEPENDENT storage namespaces.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PaymentResponseDto } from "@st-manager/contracts";

import type * as StoreModuleNs from "./store";

type StoreModule = typeof StoreModuleNs;

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
}));

const serverState = vi.hoisted(() => ({
  payments: [] as PaymentResponseDto[],
  nextSeq: 1,
}));

const paymentsApiMock = vi.hoisted(() => ({
  createPayment: vi.fn(async (payload: Record<string, string | number>) => {
    const now = new Date().toISOString();
    const created: PaymentResponseDto = {
      id: `srv_pay_${serverState.nextSeq}`,
      studioId: "studio-shared",
      projectId: String(payload.projectId),
      amount: Math.max(0, Math.round(Number(payload.amount))),
      method: payload.method === "upi" ? "upi" : "cash",
      notes: String(payload.notes ?? ""),
      receivedBy: String(payload.receivedBy ?? ""),
      source: payload.source === "advance" ? "advance" : "manual",
      status: "received",
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.nextSeq += 1;
    serverState.payments.push(created);
    return created;
  }),
  listPayments: vi.fn(async () => ({
    data: serverState.payments.filter((payment) => !payment.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.payments.length },
  })),
  pullPaymentChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    const records = serverState.payments.filter(
      (payment) => Date.parse(payment.updatedAt) > sinceMs,
    );
    return {
      records,
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getPayment: vi.fn(async (id: string) => {
    const found = serverState.payments.find((payment) => payment.id === id && !payment.deletedAt);
    if (!found) throw new Error("not found");
    return found;
  }),
  deletePayment: vi.fn(async (id: string) => {
    const found = serverState.payments.find((payment) => payment.id === id);
    if (found) {
      found.deletedAt = new Date().toISOString();
      found.updatedAt = found.deletedAt;
    }
  }),
  updatePayment: vi.fn(async (id: string, patch: Record<string, string | number>) => {
    const found = serverState.payments.find((payment) => payment.id === id && !payment.deletedAt);
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
  paymentsApi: paymentsApiMock,
}));

vi.mock("@st-manager/api-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@st-manager/api-sdk")>();
  return actual;
});

vi.mock("@/lib/projects/store", () => ({
  flushPendingProjectCreates: vi.fn(async () => undefined),
}));

vi.mock("@/lib/projects/offline-queue", () => ({
  isLocalProjectId: vi.fn((id: string) => id.startsWith("local_prj_")),
  listPendingProjectCreates: vi.fn(() => []),
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
  amount: 5000,
  method: "cash" as const,
  notes: "Session payment",
  receivedBy: "owner@studio.test",
  source: "manual" as const,
  status: "received" as const,
};

describe("two-device payment sync (independent storage namespaces)", () => {
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
    store.setPaymentsStoreSnapshot([]);
    store.hydratePaymentsSnapshotFromCache();
    return fn();
  }

  beforeEach(async () => {
    authState.studioId = "studio-shared";
    serverState.payments = [];
    serverState.nextSeq = 1;
    deviceAStorage.clear();
    deviceBStorage.clear();
    paymentsApiMock.createPayment.mockClear();
    paymentsApiMock.listPayments.mockClear();
    paymentsApiMock.pullPaymentChanges.mockClear();
    paymentsApiMock.updatePayment.mockClear();
    paymentsApiMock.deletePayment.mockClear();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    installStorage("A");
    vi.resetModules();
    store = await import("./store");
    store.setPaymentsStoreSnapshot([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Device A create → Device B pull receives payment", async () => {
    const createdOnA = await asDevice("A", async () => {
      const created = await store.createPaymentOfflineAware(basePayload);
      store.writePaymentsSyncCursor(new Date(Date.now() - 60_000).toISOString());
      return created;
    });

    expect(createdOnA.amount).toBe(5000);
    expect(serverState.payments).toHaveLength(1);

    const onB = await asDevice("B", async () => {
      store.writePaymentsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcilePaymentsFromApi();
    });
    expect(onB.filter((payment) => payment.id === createdOnA.id)).toHaveLength(1);
  });

  it("Device A delete → Device B tombstone via reconcile", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createPaymentOfflineAware(basePayload),
    );

    await asDevice("B", async () => {
      store.writePaymentsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcilePaymentsFromApi();
    });

    await asDevice("A", async () => {
      await paymentsApiMock.deletePayment(createdOnA.id);
      store.removePaymentFromSnapshot(createdOnA.id);
    });

    const onBAfterDelete = await asDevice("B", async () => {
      store.writePaymentsSyncCursor(new Date(Date.now() + 60_000).toISOString());
      return store.reconcilePaymentsFromApi();
    });
    expect(onBAfterDelete.some((payment) => payment.id === createdOnA.id)).toBe(false);
  });

  it("offline create → reconnect exactly once, remap temp id", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () => store.createPaymentOfflineAware(basePayload));
    expect(local.id.startsWith("local_pay_")).toBe(true);
    expect(paymentsApiMock.createPayment).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    const afterFlush = await asDevice("A", async () => {
      await store.flushPendingPaymentCreates();
      await store.flushPendingPaymentCreates();
      return store.getPaymentsStoreSnapshot();
    });

    expect(paymentsApiMock.createPayment).toHaveBeenCalledTimes(1);
    expect(afterFlush.some((payment) => payment.id === local.id)).toBe(false);
    expect(afterFlush).toHaveLength(1);
    expect(afterFlush[0]?.id.startsWith("srv_pay_")).toBe(true);
  });

  it("two isolated storage namespaces never leak cache rows", async () => {
    await asDevice("A", async () => {
      await store.createPaymentOfflineAware(basePayload);
    });

    const onB = await asDevice("B", async () => {
      store.setPaymentsStoreSnapshot([]);
      return store.hydratePaymentsSnapshotFromCache();
    });
    expect(onB.some((payment) => payment.amount === 5000)).toBe(false);
  });

  it("waits for project flush when project id is still local", async () => {
    const { flushPendingProjectCreates } = await import("@/lib/projects/store");
    const { listPendingProjectCreates } = await import("@/lib/projects/offline-queue");

    vi.mocked(listPendingProjectCreates).mockReturnValue([
      {
        localId: "local_prj_abc",
        studioId: "studio-shared",
        payload: {
          projectName: "Pending",
          clientName: "Client",
          source: "manual",
        },
        enqueuedAt: new Date().toISOString(),
        serverId: "project-server-1",
      },
    ]);

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () =>
      store.createPaymentOfflineAware({
        ...basePayload,
        projectId: "local_prj_abc",
      }),
    );
    expect(local.id.startsWith("local_pay_")).toBe(true);

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    await asDevice("A", async () => {
      await store.flushPendingPaymentCreates();
      expect(flushPendingProjectCreates).toHaveBeenCalled();
      expect(paymentsApiMock.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "project-server-1" }),
      );
    });
  });
});
