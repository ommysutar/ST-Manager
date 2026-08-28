import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientResponseDto } from "@st-manager/contracts";

const authState = vi.hoisted(() => ({
  studioId: "studio-a" as string | null,
}));

const clientsApiMock = vi.hoisted(() => ({
  createClient: vi.fn(),
  listClients: vi.fn(),
  pullClientChanges: vi.fn(),
  getClient: vi.fn(),
  deleteClient: vi.fn(),
  updateClient: vi.fn(),
}));

vi.mock("@/lib/token-store", () => ({
  getAuthUserSnapshot: () =>
    authState.studioId
      ? { id: "user-1", email: "owner@studio.test", role: "owner", studioId: authState.studioId }
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

import {
  enqueuePendingClientCreate,
  isLocalClientId,
  listPendingClientCreates,
  type PendingClientCreatePayload,
} from "./offline-queue";
import {
  applyClientChangeRecords,
  applyAuthoritativeActiveList,
  createClientOfflineAware,
  flushPendingClientCreates,
  getClientsSnapshot,
  hydrateClientsSnapshotFromCache,
  reconcileClientsFromApi,
  removeClientFromSnapshot,
  setClientsSnapshot,
  upsertClientInSnapshot,
  writeClientsSyncCursor,
} from "./store";

const payload: PendingClientCreatePayload = {
  name: "Offline Client",
  phone: "+15551212",
  whatsappNumber: "+15551212",
  whatsappSameAsPhone: true,
  email: "offline@studio.test",
  company: "Offline Co",
  notes: "created offline",
};

function serverClient(overrides: Partial<ClientResponseDto> = {}): ClientResponseDto {
  return {
    id: "server-cli-1",
    studioId: "studio-a",
    name: payload.name,
    displayNumber: "CL-0001",
    email: payload.email,
    phone: payload.phone,
    whatsappNumber: payload.whatsappNumber,
    whatsappSameAsPhone: payload.whatsappSameAsPhone,
    company: payload.company,
    notes: payload.notes,
    deletedAt: null,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("offline client create + reconcile", () => {
  beforeEach(() => {
    authState.studioId = "studio-a";
    localStorage.clear();
    setClientsSnapshot([]);
    clientsApiMock.createClient.mockReset();
    clientsApiMock.listClients.mockReset();
    clientsApiMock.listClients.mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0 },
    });
    clientsApiMock.pullClientChanges.mockReset();
    clientsApiMock.getClient.mockReset();
    clientsApiMock.deleteClient.mockReset();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("A: normal online create → exactly one server record", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    const created = serverClient();
    clientsApiMock.createClient.mockResolvedValue(created);

    const first = await createClientOfflineAware(payload);
    const second = await createClientOfflineAware(payload);

    expect(clientsApiMock.createClient).toHaveBeenCalledTimes(1);
    expect(first.id).toBe(created.id);
    expect(second.id).toBe(created.id);
    expect(getClientsSnapshot().filter((c) => c.id === created.id)).toHaveLength(1);
  });

  it("B: create → update path keeps a single server id", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    const created = serverClient();
    clientsApiMock.createClient.mockResolvedValue(created);
    await createClientOfflineAware(payload);

    const updated = serverClient({
      company: "Updated Co",
      updatedAt: "2026-08-10T02:00:00.000Z",
    });
    upsertClientInSnapshot(updated);

    expect(getClientsSnapshot().filter((c) => c.name === payload.name)).toHaveLength(1);
    expect(getClientsSnapshot()[0]?.company).toBe("Updated Co");
    expect(clientsApiMock.createClient).toHaveBeenCalledTimes(1);
  });

  it("appears locally immediately while offline and queues a non-secret payload", async () => {
    const created = await createClientOfflineAware(payload);

    expect(isLocalClientId(created.id)).toBe(true);
    expect(getClientsSnapshot().some((client) => client.id === created.id)).toBe(true);
    expect(clientsApiMock.createClient).not.toHaveBeenCalled();

    const pending = listPendingClientCreates("studio-a");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.payload).toEqual(payload);
    expect(JSON.stringify(pending[0])).not.toMatch(/password|refreshToken|accessToken|secret/i);
  });

  it("C: offline create → reconnect → exactly one server record", async () => {
    const local = await createClientOfflineAware(payload);
    const created = serverClient();
    clientsApiMock.createClient.mockResolvedValue(created);

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    await flushPendingClientCreates();
    await flushPendingClientCreates();

    expect(clientsApiMock.createClient).toHaveBeenCalledTimes(1);
    expect(clientsApiMock.createClient).toHaveBeenCalledWith(payload);
    expect(getClientsSnapshot().some((client) => client.id === created.id)).toBe(true);
    expect(getClientsSnapshot().some((client) => client.id === local.id)).toBe(false);
    expect(listPendingClientCreates("studio-a")).toHaveLength(0);
  });

  it("D/E: retry after successful server create with remembered serverId → no duplicate + remap", async () => {
    const localId = "local_cli_retrytest";
    const created = serverClient();

    enqueuePendingClientCreate({
      localId,
      studioId: "studio-a",
      payload,
      enqueuedAt: new Date().toISOString(),
      serverId: created.id,
    });
    setClientsSnapshot([
      {
        ...created,
        id: localId,
        displayNumber: "",
      },
      created,
    ]);

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    await flushPendingClientCreates();
    await flushPendingClientCreates();

    expect(clientsApiMock.createClient).not.toHaveBeenCalled();
    expect(getClientsSnapshot().filter((client) => client.id === created.id)).toHaveLength(1);
    expect(getClientsSnapshot().some((client) => client.id === localId)).toBe(false);
    expect(listPendingClientCreates("studio-a")).toHaveLength(0);
  });

  it("F: remote client pull updates snapshot without duplicates", async () => {
    writeClientsSyncCursor("2026-08-09T00:00:00.000Z", "studio-a");
    setClientsSnapshot([]);
    hydrateClientsSnapshotFromCache();

    const remote = serverClient({
      id: "server-cli-remote",
      name: "From Device A",
      displayNumber: "CL-0002",
      updatedAt: "2026-08-10T01:00:00.000Z",
    });
    clientsApiMock.pullClientChanges.mockResolvedValue({
      records: [remote],
      serverTime: "2026-08-10T01:00:00.000Z",
      hasMore: false,
    });
    clientsApiMock.listClients.mockResolvedValue({
      data: [remote],
      meta: { page: 1, pageSize: 100, total: 1 },
    });

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    const next = await reconcileClientsFromApi();
    expect(next.some((client) => client.id === remote.id && client.name === "From Device A")).toBe(
      true,
    );
    expect(clientsApiMock.pullClientChanges).toHaveBeenCalledWith({
      since: "2026-08-09T00:00:00.000Z",
    });
  });

  it("J: delete/tombstone removes client and survives reconcile", async () => {
    const remote = serverClient({ id: "server-cli-del", name: "To Delete" });
    setClientsSnapshot([remote]);
    removeClientFromSnapshot(remote.id);
    expect(getClientsSnapshot().some((c) => c.id === remote.id)).toBe(false);

    applyClientChangeRecords([
      {
        ...remote,
        deletedAt: "2026-08-10T03:00:00.000Z",
        updatedAt: "2026-08-10T03:00:00.000Z",
      },
    ]);
    expect(getClientsSnapshot().some((c) => c.id === remote.id)).toBe(false);
  });

  it("K: LWW stale update does not overwrite newer local", () => {
    const local = serverClient({
      id: "server-cli-lww",
      company: "New",
      updatedAt: "2026-08-10T05:00:00.000Z",
    });
    setClientsSnapshot([local]);
    applyClientChangeRecords([
      {
        ...local,
        company: "Stale",
        updatedAt: "2026-08-10T04:00:00.000Z",
      },
    ]);
    expect(getClientsSnapshot().find((c) => c.id === local.id)?.company).toBe("New");
  });

  it("L: stable CL-xxxx display number is retained from server", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    const created = serverClient({ displayNumber: "CL-0007" });
    clientsApiMock.createClient.mockResolvedValue(created);
    const result = await createClientOfflineAware(payload);
    expect(result.displayNumber).toBe("CL-0007");
    expect(getClientsSnapshot()[0]?.displayNumber).toBe("CL-0007");
  });

  it("applyClientChangeRecords merges remote creates without duplication", () => {
    const remote = serverClient({ id: "server-cli-2", name: "Remote", displayNumber: "CL-0003" });
    setClientsSnapshot([remote]);
    applyClientChangeRecords([remote, { ...remote, updatedAt: "2026-08-10T02:00:00.000Z" }]);
    expect(getClientsSnapshot().filter((client) => client.id === remote.id)).toHaveLength(1);
  });

  it("authoritative list only tombstones ids known before the list fetch", () => {
    const known = serverClient({ id: "server-cli-known", name: "Known" });
    const newborn = serverClient({ id: "server-cli-new", name: "Newborn", displayNumber: "CL-0009" });
    setClientsSnapshot([known, newborn]);

    applyAuthoritativeActiveList([known], new Set([known.id]));

    expect(getClientsSnapshot().some((c) => c.id === known.id)).toBe(true);
    expect(getClientsSnapshot().some((c) => c.id === newborn.id)).toBe(true);
  });

  it("authoritative list tombstones known ids missing from the server list", () => {
    const known = serverClient({ id: "server-cli-gone", name: "Gone" });
    setClientsSnapshot([known]);
    applyAuthoritativeActiveList([], new Set([known.id]));
    expect(getClientsSnapshot().some((c) => c.id === known.id)).toBe(false);
  });

  it("authoritative active list restores a client even if a local tombstone is newer", () => {
    const remote = serverClient({ id: "server-cli-restore", name: "Restored" });
    setClientsSnapshot([remote]);
    removeClientFromSnapshot(remote.id);
    applyAuthoritativeActiveList([remote], new Set());
    expect(getClientsSnapshot().some((c) => c.id === remote.id)).toBe(true);
  });
});
