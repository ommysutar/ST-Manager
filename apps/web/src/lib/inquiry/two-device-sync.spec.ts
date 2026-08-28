/**
 * Two-device Inquiry sync simulation with INDEPENDENT storage namespaces.
 * Device A and Device B never share the same localStorage object.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InquiryResponseDto } from "@st-manager/contracts";

import type * as StoreModuleNs from "./store";

type StoreModule = typeof StoreModuleNs;

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
}));

const serverState = vi.hoisted(() => ({
  inquiries: [] as InquiryResponseDto[],
  nextSeq: 1,
}));

const baseForm = {
  existingClientId: "",
  clientName: "Sync Client",
  mobileNumber: "9876543210",
  whatsappNumber: "",
  email: "",
  address: "",
  reference: "",
  notes: "",
  projectName: "Sync Inquiry",
  projectCategory: "wedding",
  eventDate: "",
  deliveryDate: "",
  priority: "medium",
  projectDescription: "",
  selectedServiceIds: ["svc-1"],
  servicePricingTier: "standard",
  customServices: [],
  serviceHours: {},
  studioRentHours: 0,
  studioDiscountType: "percent",
  studioDiscountPercent: 0,
  studioDiscountAmount: 0,
  advancePercent: 0,
};

const baseQuotation = {
  planAmount: 0,
  serviceLines: [{ id: "svc-1", name: "Photo", price: 10000 }],
  customServiceLines: [],
  studioRentHours: 0,
  studioRentRate: 0,
  studioRentAmount: 0,
  servicesSubtotal: 10000,
  subtotal: 10000,
  discountAmount: 0,
  grandTotal: 10000,
};

const basePayload = {
  status: "inquiry",
  projectId: null,
  advanceAmount: null,
  remainingBalance: null,
  form: baseForm,
  quotation: baseQuotation,
};

const inquiriesApiMock = vi.hoisted(() => ({
  createInquiry: vi.fn(async (payload: typeof basePayload) => {
    const duplicate = serverState.inquiries.find((inquiry) => {
      if (inquiry.deletedAt) return false;
      const form = inquiry.form as typeof baseForm;
      return (
        form.projectName.trim().toLowerCase() === payload.form.projectName.trim().toLowerCase() &&
        form.clientName.trim().toLowerCase() === payload.form.clientName.trim().toLowerCase() &&
        form.mobileNumber.trim() === payload.form.mobileNumber.trim()
      );
    });
    if (duplicate) {
      return duplicate;
    }

    const now = new Date().toISOString();
    const created: InquiryResponseDto = {
      id: `srv_inq_${serverState.nextSeq}`,
      studioId: "studio-shared",
      inquiryNumber: `INQ-${String(serverState.nextSeq).padStart(4, "0")}`,
      status: payload.status ?? "inquiry",
      projectId: payload.projectId ?? null,
      advanceAmount: payload.advanceAmount ?? null,
      remainingBalance: payload.remainingBalance ?? null,
      form: payload.form,
      quotation: payload.quotation,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.nextSeq += 1;
    serverState.inquiries.push(created);
    return created;
  }),
  listInquiries: vi.fn(async () => ({
    data: serverState.inquiries.filter((inquiry) => !inquiry.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.inquiries.length },
  })),
  pullInquiryChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    const records = serverState.inquiries.filter(
      (inquiry) => Date.parse(inquiry.updatedAt) > sinceMs,
    );
    return {
      records,
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getInquiry: vi.fn(async (id: string) => {
    const found = serverState.inquiries.find((inquiry) => inquiry.id === id && !inquiry.deletedAt);
    if (!found) throw new Error("not found");
    return found;
  }),
  deleteInquiry: vi.fn(async (id: string) => {
    const found = serverState.inquiries.find((inquiry) => inquiry.id === id);
    if (found) {
      found.deletedAt = new Date().toISOString();
      found.updatedAt = found.deletedAt;
    }
  }),
  updateInquiry: vi.fn(async (id: string, patch: Record<string, unknown>) => {
    const found = serverState.inquiries.find((inquiry) => inquiry.id === id && !inquiry.deletedAt);
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
  inquiriesApi: inquiriesApiMock,
}));

vi.mock("@/lib/projects/store", () => ({
  flushPendingProjectCreates: vi.fn(async () => undefined),
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

describe("two-device inquiry sync (independent storage namespaces)", () => {
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
    store.setInquiriesStoreSnapshot([]);
    store.hydrateInquiriesSnapshotFromCache();
    return fn();
  }

  beforeEach(async () => {
    authState.studioId = "studio-shared";
    serverState.inquiries = [];
    serverState.nextSeq = 1;
    deviceAStorage.clear();
    deviceBStorage.clear();
    inquiriesApiMock.createInquiry.mockClear();
    inquiriesApiMock.listInquiries.mockClear();
    inquiriesApiMock.pullInquiryChanges.mockClear();
    inquiriesApiMock.updateInquiry.mockClear();
    inquiriesApiMock.deleteInquiry.mockClear();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    installStorage("A");
    vi.resetModules();
    store = await import("./store");
    store.setInquiriesStoreSnapshot([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("A: Device A create → Device B pull once receives server inquiryNumber", async () => {
    const createdOnA = await asDevice("A", async () => {
      const created = await store.createInquiryOfflineAware({
        ...basePayload,
        form: { ...baseForm, projectName: "QA Sync Twin", clientName: "Twin Client" },
      });
      store.writeInquiriesSyncCursor(new Date(Date.now() - 60_000).toISOString());
      return created;
    });

    expect(createdOnA.inquiryNumber).toBe("INQ-0001");
    expect(serverState.inquiries).toHaveLength(1);

    const onB = await asDevice("B", async () => {
      store.writeInquiriesSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileInquiriesFromApi();
    });
    expect(onB.filter((inquiry) => inquiry.id === createdOnA.id)).toHaveLength(1);
    expect(onB[0]?.inquiryNumber).toBe("INQ-0001");
    expect(activeDevice).toBeTruthy();
  });

  it("B: Device B update → Device A pull receives update", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createInquiryOfflineAware({
        ...basePayload,
        form: { ...baseForm, projectName: "Update Twin", clientName: "Update Client" },
      }),
    );

    await asDevice("B", async () => {
      store.writeInquiriesSyncCursor(new Date(Date.now() - 120_000).toISOString());
      await store.reconcileInquiriesFromApi();
      const updated = await inquiriesApiMock.updateInquiry(createdOnA.id, {
        status: "project",
      });
      store.upsertInquiryInSnapshot(
        (await import("./map-dto")).dtoToSavedInquiry(updated),
      );
    });

    const onAAfterUpdate = await asDevice("A", async () => {
      store.writeInquiriesSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileInquiriesFromApi();
    });
    expect(onAAfterUpdate.find((inquiry) => inquiry.id === createdOnA.id)?.status).toBe("project");
  });

  it("C: Device A delete → Device B tombstone via reconcile", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createInquiryOfflineAware({
        ...basePayload,
        form: { ...baseForm, projectName: "Delete Twin", clientName: "Delete Client" },
      }),
    );

    await asDevice("B", async () => {
      store.writeInquiriesSyncCursor("2026-01-01T00:00:00.000Z");
      const next = await store.reconcileInquiriesFromApi();
      expect(next.some((inquiry) => inquiry.id === createdOnA.id)).toBe(true);
    });

    await asDevice("A", async () => {
      await inquiriesApiMock.deleteInquiry(createdOnA.id);
      store.removeInquiryFromSnapshot(createdOnA.id);
    });

    const onBAfterDelete = await asDevice("B", async () => {
      store.writeInquiriesSyncCursor(new Date(Date.now() + 60_000).toISOString());
      return store.reconcileInquiriesFromApi();
    });
    expect(onBAfterDelete.some((inquiry) => inquiry.id === createdOnA.id)).toBe(false);

    const afterReload = await asDevice("B", async () => {
      store.setInquiriesStoreSnapshot([]);
      return store.hydrateInquiriesSnapshotFromCache();
    });
    expect(afterReload.some((inquiry) => inquiry.id === createdOnA.id)).toBe(false);
  });

  it("D: tombstone survives repeated reconcile and reload", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createInquiryOfflineAware({
        ...basePayload,
        form: { ...baseForm, projectName: "Tombstone Twin", clientName: "Tomb Client" },
      }),
    );

    await asDevice("B", async () => {
      store.writeInquiriesSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcileInquiriesFromApi();
    });

    await asDevice("A", async () => {
      await inquiriesApiMock.deleteInquiry(createdOnA.id);
      store.removeInquiryFromSnapshot(createdOnA.id);
    });

    for (let i = 0; i < 3; i += 1) {
      const again = await asDevice("B", async () => {
        store.writeInquiriesSyncCursor(new Date(Date.now() + 60_000).toISOString());
        return store.reconcileInquiriesFromApi();
      });
      expect(again.some((inquiry) => inquiry.id === createdOnA.id)).toBe(false);
    }
    expect(serverState.inquiries.filter((inquiry) => !inquiry.deletedAt)).toHaveLength(0);
  });

  it("E: offline create → reconnect exactly once, remap temp id, keep server inquiryNumber", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () =>
      store.createInquiryOfflineAware({
        ...basePayload,
        form: { ...baseForm, projectName: "Offline Twin", clientName: "Offline Client" },
      }),
    );
    expect(local.id.startsWith("local_inq_")).toBe(true);
    expect(local.inquiryNumber).toBe("");
    expect(inquiriesApiMock.createInquiry).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    const afterFlush = await asDevice("A", async () => {
      await store.flushPendingInquiryCreates();
      await store.flushPendingInquiryCreates();
      return store.getInquiriesStoreSnapshot();
    });

    expect(inquiriesApiMock.createInquiry).toHaveBeenCalledTimes(1);
    expect(afterFlush.some((inquiry) => inquiry.id === local.id)).toBe(false);
    expect(afterFlush).toHaveLength(1);
    expect(afterFlush[0]?.inquiryNumber).toBe("INQ-0001");
    expect(afterFlush[0]?.id.startsWith("srv_inq_")).toBe(true);
    expect(serverState.inquiries.filter((inquiry) => !inquiry.deletedAt)).toHaveLength(1);
  });

  it("F: two isolated storage namespaces never leak cache rows", async () => {
    await asDevice("A", async () => {
      await store.createInquiryOfflineAware({
        ...basePayload,
        form: { ...baseForm, projectName: "Only On A", clientName: "Only Client" },
      });
    });

    const onB = await asDevice("B", async () => {
      store.setInquiriesStoreSnapshot([]);
      return store.hydrateInquiriesSnapshotFromCache();
    });
    expect(onB.some((inquiry) => inquiry.form.projectName === "Only On A")).toBe(false);
  });
});
