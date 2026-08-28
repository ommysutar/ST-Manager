/**
 * Two-device Project sync simulation with INDEPENDENT storage namespaces.
 * Device A and Device B never share the same localStorage object.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectResponseDto } from "@st-manager/contracts";

import type * as StoreModuleNs from "./store";

type StoreModule = typeof StoreModuleNs;

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
}));

const serverState = vi.hoisted(() => ({
  projects: [] as ProjectResponseDto[],
  nextSeq: 1,
}));

const basePayload = {
  source: "manual" as const,
  inquiryId: null,
  clientId: null,
  projectName: "Sync Project",
  clientName: "Sync Client",
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
  selectedServiceIds: [] as string[],
  quotation: undefined,
  tasks: [] as unknown[],
  files: [] as unknown[],
  links: [] as unknown[],
  expenses: [] as unknown[],
  sessionIds: [] as string[],
  bookingIds: [] as string[],
  invoiceIds: [] as string[],
};

const projectsApiMock = vi.hoisted(() => ({
  createProject: vi.fn(async (payload: typeof basePayload) => {
    const duplicate = serverState.projects.find((project) => {
      if (project.deletedAt) return false;
      const inquiryId = String(payload.inquiryId ?? "").trim();
      if (inquiryId && project.inquiryId === inquiryId) {
        return true;
      }
      return (
        !inquiryId &&
        project.projectName.trim().toLowerCase() === payload.projectName.trim().toLowerCase() &&
        project.clientName.trim().toLowerCase() === payload.clientName.trim().toLowerCase()
      );
    });
    if (duplicate) {
      return duplicate;
    }

    const now = new Date().toISOString();
    const created: ProjectResponseDto = {
      id: `srv_${serverState.nextSeq}`,
      studioId: "studio-shared",
      projectNumber: `PRJ-${String(serverState.nextSeq).padStart(4, "0")}`,
      source: payload.source,
      inquiryId: payload.inquiryId ?? null,
      clientId: payload.clientId ?? null,
      projectName: payload.projectName,
      clientName: payload.clientName,
      clientMobile: payload.clientMobile ?? null,
      clientEmail: payload.clientEmail ?? null,
      projectCategory: payload.projectCategory ?? null,
      status: payload.status ?? "active",
      assignedEngineer: payload.assignedEngineer ?? "",
      planId: payload.planId ?? null,
      advanceReceived: payload.advanceReceived ?? 0,
      remainingBalance: payload.remainingBalance ?? 0,
      grandTotal: payload.grandTotal ?? 0,
      notes: payload.notes ?? null,
      selectedServiceIds: payload.selectedServiceIds ?? [],
      quotation: payload.quotation,
      tasks: payload.tasks ?? [],
      files: payload.files ?? [],
      links: payload.links ?? [],
      expenses: payload.expenses ?? [],
      sessionIds: payload.sessionIds ?? [],
      bookingIds: payload.bookingIds ?? [],
      invoiceIds: payload.invoiceIds ?? [],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    serverState.nextSeq += 1;
    serverState.projects.push(created);
    return created;
  }),
  listProjects: vi.fn(async () => ({
    data: serverState.projects.filter((project) => !project.deletedAt),
    meta: { page: 1, pageSize: 100, total: serverState.projects.length },
  })),
  pullProjectChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    const records = serverState.projects.filter((project) => Date.parse(project.updatedAt) > sinceMs);
    return {
      records,
      serverTime: new Date().toISOString(),
      hasMore: false,
    };
  }),
  getProject: vi.fn(async (id: string) => {
    const found = serverState.projects.find((project) => project.id === id && !project.deletedAt);
    if (!found) throw new Error("not found");
    return found;
  }),
  deleteProject: vi.fn(async (id: string) => {
    const found = serverState.projects.find((project) => project.id === id);
    if (found) {
      found.deletedAt = new Date().toISOString();
      found.updatedAt = found.deletedAt;
    }
  }),
  updateProject: vi.fn(async (id: string, patch: Record<string, unknown>) => {
    const found = serverState.projects.find((project) => project.id === id && !project.deletedAt);
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
  projectsApi: projectsApiMock,
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

describe("two-device project sync (independent storage namespaces)", () => {
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
    store.setProjectsSnapshot([]);
    store.hydrateProjectsSnapshotFromCache();
    return fn();
  }

  beforeEach(async () => {
    authState.studioId = "studio-shared";
    serverState.projects = [];
    serverState.nextSeq = 1;
    deviceAStorage.clear();
    deviceBStorage.clear();
    projectsApiMock.createProject.mockClear();
    projectsApiMock.listProjects.mockClear();
    projectsApiMock.pullProjectChanges.mockClear();
    projectsApiMock.updateProject.mockClear();
    projectsApiMock.deleteProject.mockClear();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    installStorage("A");
    vi.resetModules();
    store = await import("./store");
    store.setProjectsSnapshot([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("A: Device A create → Device B pull once receives server projectNumber", async () => {
    const createdOnA = await asDevice("A", async () => {
      const created = await store.createProjectOfflineAware({
        ...basePayload,
        projectName: "QA Sync Twin",
        clientName: "Twin Client",
      });
      store.writeProjectsSyncCursor(new Date(Date.now() - 60_000).toISOString());
      return created;
    });

    expect(createdOnA.projectNumber).toBe("PRJ-0001");
    expect(serverState.projects).toHaveLength(1);

    const onB = await asDevice("B", async () => {
      store.writeProjectsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileProjectsFromApi();
    });
    expect(onB.filter((project) => project.id === createdOnA.id)).toHaveLength(1);
    expect(onB[0]?.projectNumber).toBe("PRJ-0001");
    expect(activeDevice).toBeTruthy();
  });

  it("B: Device B update → Device A pull receives update", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createProjectOfflineAware({
        ...basePayload,
        projectName: "Update Twin",
        clientName: "Update Client",
      }),
    );

    await asDevice("B", async () => {
      store.writeProjectsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      await store.reconcileProjectsFromApi();
      const updated = await projectsApiMock.updateProject(createdOnA.id, {
        notes: "Edited On B",
      });
      store.upsertProjectInSnapshot(
        (await import("./map-dto")).dtoToStudioProject(updated),
      );
    });

    const onAAfterUpdate = await asDevice("A", async () => {
      store.writeProjectsSyncCursor(new Date(Date.now() - 120_000).toISOString());
      return store.reconcileProjectsFromApi();
    });
    expect(onAAfterUpdate.find((project) => project.id === createdOnA.id)?.notes).toBe(
      "Edited On B",
    );
  });

  it("C: Device A delete → Device B tombstone via reconcile", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createProjectOfflineAware({
        ...basePayload,
        projectName: "Delete Twin",
        clientName: "Delete Client",
      }),
    );

    await asDevice("B", async () => {
      store.writeProjectsSyncCursor("2026-01-01T00:00:00.000Z");
      const next = await store.reconcileProjectsFromApi();
      expect(next.some((project) => project.id === createdOnA.id)).toBe(true);
    });

    await asDevice("A", async () => {
      await projectsApiMock.deleteProject(createdOnA.id);
      store.removeProjectFromSnapshot(createdOnA.id);
    });

    const onBAfterDelete = await asDevice("B", async () => {
      store.writeProjectsSyncCursor(new Date(Date.now() + 60_000).toISOString());
      return store.reconcileProjectsFromApi();
    });
    expect(onBAfterDelete.some((project) => project.id === createdOnA.id)).toBe(false);

    const afterReload = await asDevice("B", async () => {
      store.setProjectsSnapshot([]);
      return store.hydrateProjectsSnapshotFromCache();
    });
    expect(afterReload.some((project) => project.id === createdOnA.id)).toBe(false);
  });

  it("D: tombstone survives repeated reconcile and reload", async () => {
    const createdOnA = await asDevice("A", async () =>
      store.createProjectOfflineAware({
        ...basePayload,
        projectName: "Tombstone Twin",
        clientName: "Tomb Client",
      }),
    );

    await asDevice("B", async () => {
      store.writeProjectsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcileProjectsFromApi();
    });

    await asDevice("A", async () => {
      await projectsApiMock.deleteProject(createdOnA.id);
      store.removeProjectFromSnapshot(createdOnA.id);
    });

    for (let i = 0; i < 3; i += 1) {
      const again = await asDevice("B", async () => {
        store.writeProjectsSyncCursor(new Date(Date.now() + 60_000).toISOString());
        return store.reconcileProjectsFromApi();
      });
      expect(again.some((project) => project.id === createdOnA.id)).toBe(false);
    }
    expect(serverState.projects.filter((project) => !project.deletedAt)).toHaveLength(0);
  });

  it("E: offline create → reconnect exactly once, remap temp id, keep server projectNumber", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const local = await asDevice("A", async () =>
      store.createProjectOfflineAware({
        ...basePayload,
        projectName: "Offline Twin",
        clientName: "Offline Client",
      }),
    );
    expect(local.id.startsWith("local_prj_")).toBe(true);
    expect(local.projectNumber).toBe("");
    expect(projectsApiMock.createProject).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    const afterFlush = await asDevice("A", async () => {
      await store.flushPendingProjectCreates();
      await store.flushPendingProjectCreates();
      return store.getProjectsSnapshot();
    });

    expect(projectsApiMock.createProject).toHaveBeenCalledTimes(1);
    expect(afterFlush.some((project) => project.id === local.id)).toBe(false);
    expect(afterFlush).toHaveLength(1);
    expect(afterFlush[0]?.projectNumber).toBe("PRJ-0001");
    expect(afterFlush[0]?.id.startsWith("srv_")).toBe(true);
    expect(serverState.projects.filter((project) => !project.deletedAt)).toHaveLength(1);
  });

  it("F: two isolated storage namespaces never leak cache rows", async () => {
    await asDevice("A", async () => {
      await store.createProjectOfflineAware({
        ...basePayload,
        projectName: "Only On A",
        clientName: "Only Client",
      });
    });

    const onB = await asDevice("B", async () => {
      store.setProjectsSnapshot([]);
      return store.hydrateProjectsSnapshotFromCache();
    });
    expect(onB.some((project) => project.projectName === "Only On A")).toBe(false);
  });
});
