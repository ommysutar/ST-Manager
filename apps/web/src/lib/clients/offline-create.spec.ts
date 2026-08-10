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
  createClientOfflineAware,
  flushPendingClientCreates,
  getClientsSnapshot,
  hydrateClientsSnapshotFromCache,
  reconcileClientsFromApi,
  setClientsSnapshot,
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

  it("flushes to the API exactly once when connection returns", async () => {
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

  it("does not duplicate when retrying after a successful create with remembered serverId", async () => {
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

  it("new device receives the created client via incremental pull", async () => {
    // Simulate a second device for the same studio, already past full hydrate.
    writeClientsSyncCursor("2026-08-09T00:00:00.000Z", "studio-a");
    setClientsSnapshot([]);
    hydrateClientsSnapshotFromCache();

    const remote = serverClient({
      id: "server-cli-remote",
      name: "From Device A",
      updatedAt: "2026-08-10T01:00:00.000Z",
    });
    clientsApiMock.pullClientChanges.mockResolvedValue({
      records: [remote],
      serverTime: "2026-08-10T01:00:00.000Z",
      hasMore: false,
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


  it("applyClientChangeRecords merges remote creates without duplication", () => {
    const remote = serverClient({ id: "server-cli-2", name: "Remote" });
    setClientsSnapshot([remote]);
    applyClientChangeRecords([remote, { ...remote, updatedAt: "2026-08-10T02:00:00.000Z" }]);
    expect(getClientsSnapshot().filter((client) => client.id === remote.id)).toHaveLength(1);
  });
});
