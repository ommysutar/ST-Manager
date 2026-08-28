/**
 * End-to-end operational sync: Client → Inquiry → Project → Booking → Payment → Documents.
 * Device A and Device B use completely isolated MemoryStorage instances.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ClientResponseDto,
  InquiryResponseDto,
  PaymentResponseDto,
  ProjectBookingResponseDto,
  ProjectResponseDto,
  StudioDocumentResponseDto,
} from "@st-manager/contracts";

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
}));

const serverState = vi.hoisted(() => ({
  clients: [] as ClientResponseDto[],
  inquiries: [] as InquiryResponseDto[],
  projects: [] as ProjectResponseDto[],
  bookings: [] as ProjectBookingResponseDto[],
  payments: [] as PaymentResponseDto[],
  documents: [] as StudioDocumentResponseDto[],
  seq: {
    client: 1,
    inquiry: 1,
    project: 1,
    booking: 1,
    payment: 1,
    document: 1,
  },
  docNumbers: { quotation: 0, invoice: 0, receipt: 0 },
}));

const baseInquiryForm = {
  existingClientId: "",
  clientName: "Operational Sync Client",
  mobileNumber: "9876543210",
  whatsappNumber: "",
  email: "e2e@test.studio",
  address: "",
  reference: "",
  notes: "",
  projectName: "E2E Wedding Album",
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
  serviceLines: [{ id: "svc-1", name: "Photo", price: 25000 }],
  customServiceLines: [],
  studioRentHours: 0,
  studioRentRate: 0,
  studioRentAmount: 0,
  servicesSubtotal: 25000,
  subtotal: 25000,
  discountAmount: 0,
  grandTotal: 25000,
};

const clientsApiMock = vi.hoisted(() => ({
  createClient: vi.fn(async (payload: Record<string, string | boolean>) => {
    const now = new Date().toISOString();
    const created: ClientResponseDto = {
      id: `srv_cli_${serverState.seq.client}`,
      studioId: "studio-shared",
      name: String(payload.name),
      displayNumber: `CL-${String(serverState.seq.client).padStart(4, "0")}`,
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
    serverState.seq.client += 1;
    serverState.clients.push(created);
    return created;
  }),
  listClients: vi.fn(async () => ({
    data: serverState.clients.filter((c) => !c.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.clients.length },
  })),
  pullClientChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    return {
      records: serverState.clients.filter((c) => Date.parse(c.updatedAt) > sinceMs),
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

const inquiriesApiMock = vi.hoisted(() => ({
  createInquiry: vi.fn(async (payload: Record<string, unknown>) => {
    const now = new Date().toISOString();
    const created: InquiryResponseDto = {
      id: `srv_inq_${serverState.seq.inquiry}`,
      studioId: "studio-shared",
      inquiryNumber: `INQ-${String(serverState.seq.inquiry).padStart(4, "0")}`,
      status: String(payload.status ?? "inquiry"),
      projectId: (payload.projectId as string) ?? null,
      advanceAmount: (payload.advanceAmount as number) ?? null,
      remainingBalance: (payload.remainingBalance as number) ?? null,
      form: payload.form as InquiryResponseDto["form"],
      quotation: payload.quotation as InquiryResponseDto["quotation"],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.seq.inquiry += 1;
    serverState.inquiries.push(created);
    return created;
  }),
  listInquiries: vi.fn(async () => ({
    data: serverState.inquiries.filter((i) => !i.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.inquiries.length },
  })),
  pullInquiryChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    return {
      records: serverState.inquiries.filter((i) => Date.parse(i.updatedAt) > sinceMs),
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getInquiry: vi.fn(),
  deleteInquiry: vi.fn(),
  updateInquiry: vi.fn(),
}));

const projectsApiMock = vi.hoisted(() => ({
  createProject: vi.fn(async (payload: Record<string, unknown>) => {
    const now = new Date().toISOString();
    const created: ProjectResponseDto = {
      id: `srv_prj_${serverState.seq.project}`,
      studioId: "studio-shared",
      projectNumber: `PRJ-${String(serverState.seq.project).padStart(4, "0")}`,
      source: (payload.source ?? "manual") as ProjectResponseDto["source"],
      inquiryId: (payload.inquiryId as string) ?? null,
      clientId: (payload.clientId as string) ?? null,
      projectName: String(payload.projectName),
      clientName: String(payload.clientName),
      clientMobile: null,
      clientEmail: null,
      projectCategory: null,
      status: "active",
      assignedEngineer: "",
      planId: null,
      advanceReceived: 0,
      remainingBalance: 0,
      grandTotal: Number(payload.grandTotal ?? 25000),
      notes: null,
      selectedServiceIds: [],
      tasks: [],
      files: [],
      links: [],
      expenses: [],
      sessionIds: [],
      bookingIds: [],
      invoiceIds: [],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.seq.project += 1;
    serverState.projects.push(created);
    return created;
  }),
  listProjects: vi.fn(async () => ({
    data: serverState.projects.filter((p) => !p.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.projects.length },
  })),
  pullProjectChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    return {
      records: serverState.projects.filter((p) => Date.parse(p.updatedAt) > sinceMs),
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getProject: vi.fn(),
  deleteProject: vi.fn(),
  updateProject: vi.fn(),
}));

const projectBookingsApiMock = vi.hoisted(() => ({
  createProjectBooking: vi.fn(async (payload: Record<string, unknown>) => {
    const now = new Date().toISOString();
    const created: ProjectBookingResponseDto = {
      id: `srv_bkg_${serverState.seq.booking}`,
      studioId: "studio-shared",
      projectId: String(payload.projectId),
      roomStudioId: String(payload.roomStudioId),
      clientId: null,
      bookingFor: String(payload.bookingFor),
      notes: String(payload.notes ?? ""),
      date: String(payload.date),
      slotId: String(payload.slotId),
      status: (payload.status ?? "booked") as ProjectBookingResponseDto["status"],
      clientName: String(payload.clientName),
      projectName: String(payload.projectName),
      projectNumber: String(payload.projectNumber ?? ""),
      engineerId: null,
      sessionId: null,
      attendanceRecorded: false,
      equipmentIds: [],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.seq.booking += 1;
    serverState.bookings.push(created);
    return created;
  }),
  listProjectBookings: vi.fn(async () => ({
    data: serverState.bookings.filter((b) => !b.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.bookings.length },
  })),
  pullProjectBookingChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    return {
      records: serverState.bookings.filter((b) => Date.parse(b.updatedAt) > sinceMs),
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getProjectBooking: vi.fn(),
  deleteProjectBooking: vi.fn(),
  updateProjectBooking: vi.fn(),
}));

const paymentsApiMock = vi.hoisted(() => ({
  createPayment: vi.fn(async (payload: Record<string, unknown>) => {
    const now = new Date().toISOString();
    const created: PaymentResponseDto = {
      id: `srv_pay_${serverState.seq.payment}`,
      studioId: "studio-shared",
      projectId: String(payload.projectId),
      amount: Number(payload.amount),
      method: String(payload.method ?? "cash") as PaymentResponseDto["method"],
      notes: String(payload.notes ?? ""),
      receivedBy: String(payload.receivedBy ?? ""),
      source: String(payload.source ?? "manual") as PaymentResponseDto["source"],
      status: String(payload.status ?? "received") as PaymentResponseDto["status"],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.seq.payment += 1;
    serverState.payments.push(created);
    return created;
  }),
  listPayments: vi.fn(async () => ({
    data: serverState.payments.filter((p) => !p.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.payments.length },
  })),
  pullPaymentChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    return {
      records: serverState.payments.filter((p) => Date.parse(p.updatedAt) > sinceMs),
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getPayment: vi.fn(),
  deletePayment: vi.fn(),
  updatePayment: vi.fn(),
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
      serverState.docNumbers[payload.type] += 1;
      const prefix =
        payload.type === "invoice" ? "INV" : payload.type === "receipt" ? "RCP" : "QTN";
      const created: StudioDocumentResponseDto = {
        id: `srv_doc_${serverState.seq.document}`,
        studioId: "studio-shared",
        type: payload.type,
        documentNumber: `${prefix}-${String(serverState.docNumbers[payload.type]).padStart(4, "0")}`,
        inquiryId: payload.inquiryId ?? null,
        projectId: payload.projectId ?? null,
        paymentId: payload.paymentId ?? null,
        snapshot: payload.snapshot ?? null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      serverState.seq.document += 1;
      serverState.documents.push(created);
      return created;
    },
  ),
  listStudioDocuments: vi.fn(async () => ({
    data: serverState.documents.filter((d) => !d.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.documents.length },
  })),
  pullStudioDocumentChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    return {
      records: serverState.documents.filter((d) => Date.parse(d.updatedAt) > sinceMs),
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getStudioDocument: vi.fn(),
  deleteStudioDocument: vi.fn(),
  updateStudioDocument: vi.fn(),
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
  tokenStore: { getAccessToken: () => "token" },
}));

vi.mock("@/lib/api-client", () => ({
  clientsApi: clientsApiMock,
  inquiriesApi: inquiriesApiMock,
  projectsApi: projectsApiMock,
  projectBookingsApi: projectBookingsApiMock,
  paymentsApi: paymentsApiMock,
  studioDocumentsApi: studioDocumentsApiMock,
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

const OLD_CURSOR = "2026-01-01T00:00:00.000Z";

describe("end-to-end operational sync (isolated two-device)", () => {
  const deviceAStorage = new MemoryStorage();
  const deviceBStorage = new MemoryStorage();

  function installStorage(device: "A" | "B") {
    const storage = device === "A" ? deviceAStorage : deviceBStorage;
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  }

  beforeEach(() => {
    authState.studioId = "studio-shared";
    serverState.clients = [];
    serverState.inquiries = [];
    serverState.projects = [];
    serverState.bookings = [];
    serverState.payments = [];
    serverState.documents = [];
    serverState.seq = { client: 1, inquiry: 1, project: 1, booking: 1, payment: 1, document: 1 };
    serverState.docNumbers = { quotation: 0, invoice: 0, receipt: 0 };
    deviceAStorage.clear();
    deviceBStorage.clear();

    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    installStorage("A");
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function asDevice<T>(device: "A" | "B", fn: () => Promise<T> | T): Promise<T> {
    installStorage(device);
    vi.resetModules();
    return fn();
  }

  it("Device A full workflow → Device B reconciles all → B updates → A sees → A deletes → B tombstones", async () => {
    const createdIds = await asDevice("A", async () => {
      const clientStore = await import("@/lib/clients/store");
      const inquiryStore = await import("@/lib/inquiry/store");
      const projectStore = await import("@/lib/projects/store");
      const bookingStore = await import("@/lib/bookings/store");
      const paymentStore = await import("@/lib/payments/store");
      const documentStore = await import("@/lib/documents/store");

      const client = await clientStore.createClientOfflineAware({
        name: "Operational Sync Client",
        phone: "+919876543210",
        whatsappNumber: "",
        whatsappSameAsPhone: false,
        email: "ops-sync@test.studio",
        company: "Ops Co",
        notes: "",
      });

      const inquiry = await inquiryStore.createInquiryOfflineAware({
        status: "inquiry",
        projectId: null,
        advanceAmount: null,
        remainingBalance: null,
        form: { ...baseInquiryForm, existingClientId: client.id },
        quotation: baseQuotation,
      });

      const project = await projectStore.createProjectOfflineAware({
        source: "inquiry",
        inquiryId: inquiry.id,
        clientId: client.id,
        projectName: "E2E Wedding Album",
        clientName: client.name,
        grandTotal: 25000,
      });

      const booking = await bookingStore.createProjectBookingOfflineAware({
        projectId: project.id,
        roomStudioId: "room-main",
        bookingFor: "Recording Session",
        notes: "",
        date: "2026-09-15",
        slotId: "slot-morning",
        status: "booked",
        clientName: client.name,
        projectName: project.projectName,
        projectNumber: project.projectNumber,
      });

      const payment = await paymentStore.createPaymentOfflineAware({
        projectId: project.id,
        amount: 10000,
        method: "cash",
        notes: "Advance",
        receivedBy: "owner@studio.test",
        source: "manual",
        status: "received",
      });

      const docSnapshot = {
        clientName: client.name,
        projectName: project.projectName,
        projectNumber: project.projectNumber,
      };

      const quotation = await documentStore.createDocumentOfflineAware({
        type: "quotation",
        inquiryId: inquiry.id,
        projectId: project.id,
        paymentId: null,
        snapshot: docSnapshot,
      });

      const invoice = await documentStore.createDocumentOfflineAware({
        type: "invoice",
        inquiryId: inquiry.id,
        projectId: project.id,
        paymentId: payment.id,
        snapshot: docSnapshot,
      });

      const receipt = await documentStore.createDocumentOfflineAware({
        type: "receipt",
        inquiryId: inquiry.id,
        projectId: project.id,
        paymentId: payment.id,
        snapshot: docSnapshot,
      });

      clientStore.writeClientsSyncCursor(OLD_CURSOR);
      inquiryStore.writeInquiriesSyncCursor(OLD_CURSOR);
      projectStore.writeProjectsSyncCursor(OLD_CURSOR);
      bookingStore.writeProjectBookingsSyncCursor(OLD_CURSOR);
      paymentStore.writePaymentsSyncCursor(OLD_CURSOR);
      documentStore.writeDocumentsSyncCursor(OLD_CURSOR);

      return {
        clientId: client.id,
        inquiryId: inquiry.id,
        projectId: project.id,
        bookingId: booking.id,
        paymentId: payment.id,
        quotationId: quotation.id,
        invoiceId: invoice.id,
        receiptId: receipt.id,
      };
    });

    expect(serverState.clients).toHaveLength(1);
    expect(serverState.inquiries).toHaveLength(1);
    expect(serverState.projects).toHaveLength(1);
    expect(serverState.bookings).toHaveLength(1);
    expect(serverState.payments).toHaveLength(1);
    expect(serverState.documents).toHaveLength(3);

    const onB = await asDevice("B", async () => {
      const clientStore = await import("@/lib/clients/store");
      const inquiryStore = await import("@/lib/inquiry/store");
      const projectStore = await import("@/lib/projects/store");
      const bookingStore = await import("@/lib/bookings/store");
      const paymentStore = await import("@/lib/payments/store");
      const documentStore = await import("@/lib/documents/store");

      clientStore.writeClientsSyncCursor(OLD_CURSOR);
      inquiryStore.writeInquiriesSyncCursor(OLD_CURSOR);
      projectStore.writeProjectsSyncCursor(OLD_CURSOR);
      bookingStore.writeProjectBookingsSyncCursor(OLD_CURSOR);
      paymentStore.writePaymentsSyncCursor(OLD_CURSOR);
      documentStore.writeDocumentsSyncCursor(OLD_CURSOR);

      const clients = await clientStore.reconcileClientsFromApi();
      const inquiries = await inquiryStore.reconcileInquiriesFromApi();
      const projects = await projectStore.reconcileProjectsFromApi();
      const bookings = await bookingStore.reconcileProjectBookingsFromApi();
      const payments = await paymentStore.reconcilePaymentsFromApi();
      const documents = await documentStore.reconcileDocumentsFromApi();

      return { clients, inquiries, projects, bookings, payments, documents };
    });

    expect(onB.clients.some((c) => c.id === createdIds.clientId)).toBe(true);
    expect(onB.inquiries.some((i) => i.id === createdIds.inquiryId)).toBe(true);
    expect(onB.projects.some((p) => p.id === createdIds.projectId)).toBe(true);
    expect(onB.bookings.some((b) => b.id === createdIds.bookingId)).toBe(true);
    expect(onB.payments.some((p) => p.id === createdIds.paymentId)).toBe(true);
    expect(onB.documents.filter((d) => d.id === createdIds.quotationId)).toHaveLength(1);
    expect(onB.documents.filter((d) => d.id === createdIds.invoiceId)).toHaveLength(1);
    expect(onB.documents.filter((d) => d.id === createdIds.receiptId)).toHaveLength(1);
    expect(onB.documents.find((d) => d.id === createdIds.invoiceId)?.documentNumber).toBe(
      "INV-0001",
    );

    await asDevice("B", async () => {
      const clientStore = await import("@/lib/clients/store");
      clientStore.writeClientsSyncCursor(OLD_CURSOR);
      await clientStore.reconcileClientsFromApi();
      await clientsApiMock.updateClient(createdIds.clientId, { company: "Updated on B" });
    });

    const onAAfterUpdate = await asDevice("A", async () => {
      const clientStore = await import("@/lib/clients/store");
      clientStore.writeClientsSyncCursor(OLD_CURSOR);
      return clientStore.reconcileClientsFromApi();
    });
    expect(onAAfterUpdate.find((c) => c.id === createdIds.clientId)?.company).toBe("Updated on B");

    await asDevice("A", async () => {
      const clientStore = await import("@/lib/clients/store");
      await clientsApiMock.deleteClient(createdIds.clientId);
      clientStore.removeClientFromSnapshot(createdIds.clientId);
    });

    const onBAfterDelete = await asDevice("B", async () => {
      const clientStore = await import("@/lib/clients/store");
      clientStore.writeClientsSyncCursor(new Date(Date.now() + 60_000).toISOString());
      return clientStore.reconcileClientsFromApi();
    });
    expect(onBAfterDelete.some((c) => c.id === createdIds.clientId)).toBe(false);

    for (let i = 0; i < 3; i += 1) {
      const again = await asDevice("B", async () => {
        const clientStore = await import("@/lib/clients/store");
        return clientStore.reconcileClientsFromApi();
      });
      expect(again.some((c) => c.id === createdIds.clientId)).toBe(false);
    }
    expect(serverState.clients.filter((c) => !c.deletedAt)).toHaveLength(0);
  });
});
