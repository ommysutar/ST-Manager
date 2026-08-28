import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectResponseDto, ProjectBookingResponseDto } from "@st-manager/contracts";

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
}));

const serverState = vi.hoisted(() => ({
  projects: [] as ProjectResponseDto[],
  bookings: [] as ProjectBookingResponseDto[],
  nextProjectSeq: 1,
  nextBookingSeq: 1,
}));

const projectsApiMock = vi.hoisted(() => ({
  createProject: vi.fn(async (payload: Record<string, unknown>) => {
    const now = new Date().toISOString();
    const created: ProjectResponseDto = {
      id: `srv_prj_${serverState.nextProjectSeq}`,
      studioId: "studio-shared",
      projectNumber: `PRJ-${String(serverState.nextProjectSeq).padStart(4, "0")}`,
      source: "manual",
      inquiryId: null,
      clientId: null,
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
      grandTotal: 0,
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
    serverState.nextProjectSeq += 1;
    serverState.projects.push(created);
    return created;
  }),
  listProjects: vi.fn(async () => ({
    data: serverState.projects.filter((project) => !project.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.projects.length },
  })),
  pullProjectChanges: vi.fn(async ({ since }: { since?: string }) => ({
    records: serverState.projects.filter(
      (project) => Date.parse(project.updatedAt) > (since ? Date.parse(since) : 0),
    ),
    serverTime: new Date().toISOString(),
    hasMore: false,
  })),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

const projectBookingsApiMock = vi.hoisted(() => ({
  createProjectBooking: vi.fn(async (payload: Record<string, unknown>) => {
    const now = new Date().toISOString();
    const created = {
      id: `srv_bkg_${serverState.nextBookingSeq}`,
      studioId: "studio-shared",
      projectId: String(payload.projectId),
      roomStudioId: String(payload.roomStudioId),
      clientId: null,
      bookingFor: String(payload.bookingFor),
      notes: "",
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
    serverState.nextBookingSeq += 1;
    serverState.bookings.push(created);
    return created;
  }),
  listProjectBookings: vi.fn(async () => ({
    data: serverState.bookings,
    meta: { page: 1, pageSize: 100, total: serverState.bookings.length },
  })),
  pullProjectBookingChanges: vi.fn(async () => ({
    records: serverState.bookings,
    serverTime: new Date().toISOString(),
    hasMore: false,
  })),
  getProjectBooking: vi.fn(),
  updateProjectBooking: vi.fn(),
  deleteProjectBooking: vi.fn(),
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
  projectsApi: projectsApiMock,
  projectBookingsApi: projectBookingsApiMock,
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

describe("cascade project id remap updates booking.projectId", () => {
  const storage = new MemoryStorage();

  beforeEach(async () => {
    authState.studioId = "studio-shared";
    serverState.projects = [];
    serverState.bookings = [];
    serverState.nextProjectSeq = 1;
    serverState.nextBookingSeq = 1;
    storage.clear();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    vi.resetModules();
  });

  it("offline project create → booking → reconnect remaps booking.projectId", async () => {
    const projectStore = await import("./store");
    const bookingStore = await import("@/lib/bookings/store");

    const localProject = await projectStore.createProjectOfflineAware({
      source: "manual",
      projectName: "Cascade Project",
      clientName: "Cascade Client",
    });
    expect(localProject.id.startsWith("local_prj_")).toBe(true);

    const localBooking = await bookingStore.createProjectBookingOfflineAware({
      projectId: localProject.id,
      roomStudioId: "room-a",
      bookingFor: "Session",
      date: "2026-08-28",
      slotId: "slot-1",
      clientName: "Cascade Client",
      projectName: "Cascade Project",
      projectNumber: "",
    });
    expect(localBooking.projectId).toBe(localProject.id);

    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });

    await projectStore.flushPendingProjectCreates();
    const remappedProject = projectStore.getProjectsSnapshot()[0];
    expect(remappedProject?.id.startsWith("srv_prj_")).toBe(true);

    await bookingStore.flushPendingProjectBookingCreates();
    const remappedBooking = bookingStore.getBookingsStoreSnapshot()[0];
    expect(remappedBooking?.projectId).toBe(remappedProject?.id);
  });
});
