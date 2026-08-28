/**
 * Two-device Document sync simulation with INDEPENDENT storage namespaces.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioDocumentResponseDto } from "@st-manager/contracts";

import type * as StoreModuleNs from "./store";

type StoreModule = typeof StoreModuleNs;

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
}));

const serverState = vi.hoisted(() => ({
  documents: [] as StudioDocumentResponseDto[],
  nextSeq: 1,
  nextNumberByType: { quotation: 0, invoice: 0, receipt: 0 } as Record<
    "quotation" | "invoice" | "receipt",
    number
  >,
}));

const studioDocumentsApiMock = vi.hoisted(() => ({
  createStudioDocument: vi.fn(
    async (payload: {
      type: "quotation" | "invoice" | "receipt";
      inquiryId?: string | null;
      projectId?: string | null;
      paymentId?: string | null;
      snapshot?: unknown;
    }) => {
      const now = new Date().toISOString();
      serverState.nextNumberByType[payload.type] += 1;
      const prefix =
        payload.type === "invoice" ? "INV" : payload.type === "receipt" ? "RCP" : "QTN";
      const created: StudioDocumentResponseDto = {
        id: `srv_doc_${serverState.nextSeq}`,
        studioId: "studio-shared",
        type: payload.type,
        documentNumber: `${prefix}-${String(serverState.nextNumberByType[payload.type]).padStart(4, "0")}`,
        inquiryId: payload.inquiryId ?? null,
        projectId: payload.projectId ?? null,
        paymentId: payload.paymentId ?? null,
        snapshot: payload.snapshot ?? null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      serverState.nextSeq += 1;
      serverState.documents.push(created);
      return created;
    },
  ),
  listStudioDocuments: vi.fn(async () => ({
    data: serverState.documents.filter((document) => !document.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.documents.length },
  })),
  pullStudioDocumentChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    const records = serverState.documents.filter(
      (document) => Date.parse(document.updatedAt) > sinceMs,
    );
    return {
      records,
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getStudioDocument: vi.fn(async (id: string) => {
    const found = serverState.documents.find((document) => document.id === id && !document.deletedAt);
    if (!found) throw new Error("not found");
    return found;
  }),
  deleteStudioDocument: vi.fn(async (id: string) => {
    const found = serverState.documents.find((document) => document.id === id);
    if (found) {
      found.deletedAt = new Date().toISOString();
      found.updatedAt = found.deletedAt;
    }
  }),
  updateStudioDocument: vi.fn(async (id: string, patch: Record<string, unknown>) => {
    const found = serverState.documents.find((document) => document.id === id && !document.deletedAt);
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
  studioDocumentsApi: studioDocumentsApiMock,
}));

vi.mock("@st-manager/api-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@st-manager/api-sdk")>();
  return actual;
});

vi.mock("@/lib/projects/store", () => ({
  flushPendingProjectCreates: vi.fn(async () => undefined),
}));

vi.mock("@/lib/payments/store", () => ({
  flushPendingPaymentCreates: vi.fn(async () => undefined),
}));

vi.mock("@/lib/projects/offline-queue", () => ({
  isLocalProjectId: vi.fn((id: string) => id.startsWith("local_prj_")),
  listPendingProjectCreates: vi.fn(() => []),
}));

vi.mock("@/lib/payments/offline-queue", () => ({
  isLocalPaymentId: vi.fn((id: string) => id.startsWith("local_pay_")),
  listPendingPaymentCreates: vi.fn(() => []),
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

const baseInvoicePayload = {
  type: "invoice" as const,
  inquiryId: null,
  projectId: "project-1",
  paymentId: null,
  snapshot: {
    clientName: "Client A",
    projectName: "Album",
    projectNumber: "PRJ-0001",
  },
};

describe("two-device document sync (independent storage namespaces)", () => {
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
    store.setDocumentsStoreSnapshot([]);
    store.hydrateDocumentsSnapshotFromCache();
    return fn();
  }

  beforeEach(async () => {
    authState.studioId = "studio-shared";
    serverState.documents = [];
    serverState.nextSeq = 1;
    serverState.nextNumberByType = { quotation: 0, invoice: 0, receipt: 0 };
    deviceAStorage.clear();
    deviceBStorage.clear();
    studioDocumentsApiMock.createStudioDocument.mockClear();
    studioDocumentsApiMock.listStudioDocuments.mockClear();
    studioDocumentsApiMock.pullStudioDocumentChanges.mockClear();
    studioDocumentsApiMock.updateStudioDocument.mockClear();
    studioDocumentsApiMock.deleteStudioDocument.mockClear();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    installStorage("A");
    vi.resetModules();
    store = await import("./store");
    store.setDocumentsStoreSnapshot([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Device A create → Device B pull receives document with server number", async () => {
    const createdOnA = await asDevice("A", async () => {
      const created = await store.createDocumentOfflineAware(baseInvoicePayload);
      store.writeDocumentsSyncCursor(new Date(Date.now() - 60_000).toISOString());
      return created;
    });

    expect(createdOnA.documentNumber).toBe("INV-0001");
    expect(serverState.documents).toHaveLength(1);

    const onB = await asDevice("B", async () => {
      store.writeDocumentsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileDocumentsFromApi();
    });
    expect(onB.filter((document) => document.id === createdOnA.id)).toHaveLength(1);
    expect(onB.find((document) => document.id === createdOnA.id)?.documentNumber).toBe("INV-0001");
  });

  it("Device A delete → Device B tombstone via reconcile", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createDocumentOfflineAware(baseInvoicePayload),
    );

    await asDevice("B", async () => {
      store.writeDocumentsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcileDocumentsFromApi();
    });

    await asDevice("A", async () => {
      await studioDocumentsApiMock.deleteStudioDocument(createdOnA.id);
      store.removeDocumentFromSnapshot(createdOnA.id);
    });

    const onBAfterDelete = await asDevice("B", async () => {
      store.writeDocumentsSyncCursor(new Date(Date.now() + 60_000).toISOString());
      return store.reconcileDocumentsFromApi();
    });
    expect(onBAfterDelete.some((document) => document.id === createdOnA.id)).toBe(false);
  });

  it("offline create → reconnect exactly once, remap temp id", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () => store.createDocumentOfflineAware(baseInvoicePayload));
    expect(local.id.startsWith("local_doc_")).toBe(true);
    expect(local.documentNumber).toBe("");
    expect(studioDocumentsApiMock.createStudioDocument).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    const afterFlush = await asDevice("A", async () => {
      await store.flushPendingDocumentCreates();
      await store.flushPendingDocumentCreates();
      return store.getDocumentsStoreSnapshot();
    });

    expect(studioDocumentsApiMock.createStudioDocument).toHaveBeenCalledTimes(1);
    expect(afterFlush.some((document) => document.id === local.id)).toBe(false);
    expect(afterFlush).toHaveLength(1);
    expect(afterFlush[0]?.id.startsWith("srv_doc_")).toBe(true);
    expect(afterFlush[0]?.documentNumber).toBe("INV-0001");
  });

  it("two isolated storage namespaces never leak cache rows", async () => {
    await asDevice("A", async () => {
      await store.createDocumentOfflineAware(baseInvoicePayload);
    });

    const onB = await asDevice("B", async () => {
      store.setDocumentsStoreSnapshot([]);
      return store.hydrateDocumentsSnapshotFromCache();
    });
    expect(onB.some((document) => document.type === "invoice")).toBe(false);
  });

  it("waits for project and payment flush when ids are still local", async () => {
    const { flushPendingProjectCreates } = await import("@/lib/projects/store");
    const { flushPendingPaymentCreates } = await import("@/lib/payments/store");
    const { listPendingProjectCreates } = await import("@/lib/projects/offline-queue");
    const { listPendingPaymentCreates } = await import("@/lib/payments/offline-queue");

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

    vi.mocked(listPendingPaymentCreates).mockReturnValue([
      {
        localId: "local_pay_abc",
        studioId: "studio-shared",
        payload: {
          projectId: "local_prj_abc",
          amount: 1000,
          method: "cash",
          notes: "",
          receivedBy: "owner",
          source: "manual",
          status: "received",
        },
        enqueuedAt: new Date().toISOString(),
        serverId: "payment-server-1",
      },
    ]);

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () =>
      store.createDocumentOfflineAware({
        type: "receipt",
        inquiryId: null,
        projectId: "local_prj_abc",
        paymentId: "local_pay_abc",
        snapshot: null,
      }),
    );
    expect(local.id.startsWith("local_doc_")).toBe(true);

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    await asDevice("A", async () => {
      await store.flushPendingDocumentCreates();
      expect(flushPendingProjectCreates).toHaveBeenCalled();
      expect(flushPendingPaymentCreates).toHaveBeenCalled();
      expect(studioDocumentsApiMock.createStudioDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "project-server-1",
          paymentId: "payment-server-1",
        }),
      );
    });
  });
});
