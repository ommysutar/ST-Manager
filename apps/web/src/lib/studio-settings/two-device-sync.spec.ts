/**
 * Two-device Studio Settings sync simulation with INDEPENDENT storage namespaces.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioSettingsResponseDto } from "@st-manager/contracts";

import type * as StoreModuleNs from "./store";

type StoreModule = typeof StoreModuleNs;

const authState = vi.hoisted(() => ({
  studioId: "studio-shared" as string | null,
  user: {
    id: "user-1",
    email: "owner@studio.test",
    role: "owner" as const,
    studioId: "studio-shared",
    fullName: "Owner",
  },
}));

const serverState = vi.hoisted(() => ({
  settings: {
    id: "settings-1",
    studioId: "studio-shared",
    profile: { fullName: "Server Studio", studioName: "Server Name" },
    whatsapp: { templates: [], updatedAt: "2026-01-01T00:00:00.000Z" },
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as StudioSettingsResponseDto,
}));

const studioSettingsApiMock = vi.hoisted(() => ({
  getStudioSettings: vi.fn(async () => ({ ...serverState.settings })),
  updateStudioSettings: vi.fn(async (input: Record<string, unknown>) => {
    const now = new Date().toISOString();
    if (input.profile !== undefined) {
      serverState.settings.profile = input.profile;
    }
    if (input.whatsapp !== undefined) {
      serverState.settings.whatsapp = input.whatsapp;
    }
    serverState.settings.updatedAt = now;
    return { ...serverState.settings };
  }),
  pullStudioSettingsChanges: vi.fn(async ({ since }: { since?: string }) => {
    const sinceMs = since ? Date.parse(since) : 0;
    const updatedMs = Date.parse(serverState.settings.updatedAt);
    const records = updatedMs > sinceMs ? [{ ...serverState.settings }] : [];
    return {
      records,
      serverTime: serverState.settings.updatedAt,
      hasMore: false,
    };
  }),
}));

vi.mock("@/lib/token-store", () => ({
  getAuthUserSnapshot: () => (authState.studioId ? authState.user : null),
  tokenStore: {
    getAccessToken: () => "token",
  },
}));

vi.mock("@/lib/api-client", () => ({
  studioSettingsApi: studioSettingsApiMock,
}));

vi.mock("@/lib/profile/events", () => ({
  notifyProfileUpdated: vi.fn(),
}));

vi.mock("@/lib/whatsapp/events", () => ({
  notifyWhatsAppSettingsUpdated: vi.fn(),
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

describe("two-device studio settings sync (independent storage namespaces)", () => {
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
    store.setStudioSettingsStoreForTests(null, null);
    store.hydrateStudioSettingsFromCache();
    return fn();
  }

  beforeEach(async () => {
    authState.studioId = "studio-shared";
    serverState.settings = {
      id: "settings-1",
      studioId: "studio-shared",
      profile: { fullName: "Server Studio", studioName: "Server Name" },
      whatsapp: { templates: [], updatedAt: "2026-01-01T00:00:00.000Z" },
      deletedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    deviceAStorage.clear();
    deviceBStorage.clear();
    studioSettingsApiMock.getStudioSettings.mockClear();
    studioSettingsApiMock.updateStudioSettings.mockClear();
    studioSettingsApiMock.pullStudioSettingsChanges.mockClear();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    installStorage("A");
    vi.resetModules();
    store = await import("./store");
    store.setStudioSettingsStoreForTests(null, null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Device A profile update → Device B reconcile receives change", async () => {
    await asDevice("A", async () => {
      store.writeStudioSettingsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.updateStudioSettingsOfflineAware({
        profile: {
          userId: "user-1",
          role: "owner",
          profilePhotoDataUrl: "",
          fullName: "Updated on A",
          studioName: "Studio A",
          mobile: "",
          email: "owner@studio.test",
          address: "",
          website: "",
          facebook: "",
          instagram: "",
          youtube: "",
          upiQrDataUrl: "",
          signatureDataUrl: "",
          logoDataUrl: "",
          gstNumber: "",
          bankDetails: { accountName: "", accountNumber: "", ifsc: "", bankName: "" },
          upiId: "",
          footerText: "",
          termsAndConditions: "",
          thankYouMessage: "Thanks",
          updatedAt: new Date().toISOString(),
        },
      });
    });

    expect(studioSettingsApiMock.updateStudioSettings).toHaveBeenCalled();

    const profileOnB = await asDevice("B", async () => {
      store.writeStudioSettingsSyncCursor("2026-01-01T00:00:00.000Z");
      await store.reconcileStudioSettingsFromApi();
      return store.getProfileFromStore();
    });

    expect(profileOnB?.fullName).toBe("Updated on A");
  });

  it("offline profile update → reconnect flushes once", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    await asDevice("A", async () => {
      await store.updateStudioSettingsOfflineAware({
        profile: {
          userId: "user-1",
          role: "owner",
          profilePhotoDataUrl: "",
          fullName: "Offline Update",
          studioName: "Offline Studio",
          mobile: "",
          email: "owner@studio.test",
          address: "",
          website: "",
          facebook: "",
          instagram: "",
          youtube: "",
          upiQrDataUrl: "",
          signatureDataUrl: "",
          logoDataUrl: "",
          gstNumber: "",
          bankDetails: { accountName: "", accountNumber: "", ifsc: "", bankName: "" },
          upiId: "",
          footerText: "",
          termsAndConditions: "",
          thankYouMessage: "Thanks",
          updatedAt: new Date().toISOString(),
        },
      });
    });

    expect(studioSettingsApiMock.updateStudioSettings).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    await asDevice("A", async () => {
      await store.flushPendingStudioSettingsUpdates();
      await store.flushPendingStudioSettingsUpdates();
    });

    expect(studioSettingsApiMock.updateStudioSettings).toHaveBeenCalledTimes(1);
    expect(
      (serverState.settings.profile as { fullName?: string }).fullName,
    ).toBe("Offline Update");
  });

  it("two isolated storage namespaces never leak settings cache", async () => {
    await asDevice("A", async () => {
      await store.refreshStudioSettingsFromApi();
    });

    const profileOnB = await asDevice("B", async () => {
      store.setStudioSettingsStoreForTests(null, null);
      store.hydrateStudioSettingsFromCache();
      return store.getProfileFromStore();
    });

    expect(profileOnB).toBeNull();
  });
});
