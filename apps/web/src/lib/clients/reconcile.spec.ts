import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  studioId: "studio-a" as string | null,
  token: "token" as string | null,
}));

const reconcileMock = vi.hoisted(() => ({
  hydrateClientsSnapshotFromCache: vi.fn(),
  reconcileClientsFromApi: vi.fn(async () => []),
  flushPendingClientCreates: vi.fn(async () => undefined),
}));

vi.mock("@/lib/token-store", () => ({
  getAuthUserSnapshot: () =>
    authState.studioId
      ? { id: "user-1", email: "owner@studio.test", role: "owner", studioId: authState.studioId }
      : null,
  tokenStore: {
    getAccessToken: () => authState.token,
  },
}));

vi.mock("./store", () => reconcileMock);

describe("client reconcile triggers", () => {
  beforeEach(() => {
    authState.studioId = "studio-a";
    authState.token = "token";
    reconcileMock.hydrateClientsSnapshotFromCache.mockClear();
    reconcileMock.reconcileClientsFromApi.mockClear();
    reconcileMock.flushPendingClientCreates.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("G/H/I: focus, visibility, and online trigger reconcile", async () => {
    const { startClientApiSync, stopClientApiSync } = await import("./reconcile");

    const stop = startClientApiSync();
    expect(reconcileMock.hydrateClientsSnapshotFromCache).toHaveBeenCalled();

    // Allow initial reconcile
    await Promise.resolve();
    await Promise.resolve();
    expect(reconcileMock.reconcileClientsFromApi.mock.calls.length).toBeGreaterThanOrEqual(1);

    const before = reconcileMock.reconcileClientsFromApi.mock.calls.length;

    window.dispatchEvent(new Event("focus"));
    await Promise.resolve();
    await Promise.resolve();
    expect(reconcileMock.reconcileClientsFromApi.mock.calls.length).toBeGreaterThan(before);

    const afterFocus = reconcileMock.reconcileClientsFromApi.mock.calls.length;
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();
    await Promise.resolve();
    expect(reconcileMock.reconcileClientsFromApi.mock.calls.length).toBeGreaterThan(afterFocus);

    const afterVisibility = reconcileMock.reconcileClientsFromApi.mock.calls.length;
    window.dispatchEvent(new Event("online"));
    await Promise.resolve();
    await Promise.resolve();
    expect(reconcileMock.flushPendingClientCreates).toHaveBeenCalled();
    expect(reconcileMock.reconcileClientsFromApi.mock.calls.length).toBeGreaterThanOrEqual(
      afterVisibility,
    );

    stop();
    stopClientApiSync();
  });
});
