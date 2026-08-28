import { DEFAULT_STUDIO_SERVICES } from "./constants";
import { notifyServicePricingUpdated } from "./events";
import { getServicePrice, normalizeServicePrices } from "./service-pricing";
import { migrateLegacyServicesToStudioCache } from "@/lib/services/backfill";
import { studioServiceToCreateDto } from "@/lib/services/map-dto";
import {
  createServiceOfflineAware,
  deleteServiceOfflineAware,
  flushPendingServiceMutations,
  getServicesStoreSnapshot,
  hydrateServicesSnapshotFromCache,
  updateServiceOfflineAware,
} from "@/lib/services/store";
import { setAllServicesSnapshot } from "./snapshots";
import type { StudioService } from "./types";
import { isBrowserOnline } from "@/lib/sync";

export { getServicePrice, normalizeServicePrices };

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeService(raw: Partial<StudioService> & { id: string }): StudioService {
  const prices = normalizeServicePrices(raw);
  return {
    id: raw.id,
    name: raw.name?.trim() || "Untitled Service",
    price: prices.standard,
    prices,
    category: raw.category?.trim() ?? "",
    description: raw.description?.trim() ?? "",
    active: raw.active ?? true,
    mandatory: raw.mandatory ?? false,
    isStudioRent: raw.isStudioRent ?? false,
  };
}

function ensureServicesHydrated(): StudioService[] {
  if (getServicesStoreSnapshot().length === 0) {
    migrateLegacyServicesToStudioCache();
    hydrateServicesSnapshotFromCache();
  }
  return getServicesStoreSnapshot();
}

export function loadAllStudioServices(): StudioService[] {
  return ensureServicesHydrated().map((service) => normalizeService(service));
}

export function getActiveStudioServices(): StudioService[] {
  return loadAllStudioServices().filter((service) => service.active);
}

function syncSnapshotFromStore(): StudioService[] {
  const normalized = getServicesStoreSnapshot().map((service) => normalizeService(service));
  setAllServicesSnapshot(normalized);
  return normalized;
}

export function persistStudioServices(services: StudioService[]): StudioService[] {
  const normalized = services.map((service) => normalizeService(service));
  setAllServicesSnapshot(normalized);
  notifyServicePricingUpdated();
  return normalized;
}

export function createStudioService(input: Omit<StudioService, "id">): StudioService {
  const payload = studioServiceToCreateDto(input, loadAllStudioServices().length);
  void createServiceOfflineAware(payload).then(() => {
    syncSnapshotFromStore();
    if (isBrowserOnline()) {
      void flushPendingServiceMutations();
    }
  });

  const optimistic = normalizeService({
    id: generateId("svc"),
    ...input,
  });
  persistStudioServices([optimistic, ...loadAllStudioServices()]);
  return optimistic;
}

export function updateStudioService(
  id: string,
  input: Partial<Omit<StudioService, "id">>,
): StudioService | null {
  const services = loadAllStudioServices();
  const index = services.findIndex((service) => service.id === id);
  if (index === -1) {
    return null;
  }

  const updated = normalizeService({ ...services[index], ...input, id });
  services[index] = updated;
  persistStudioServices(services);

  void updateServiceOfflineAware(id, input).then(() => {
    syncSnapshotFromStore();
    if (isBrowserOnline()) {
      void flushPendingServiceMutations();
    }
  });

  return updated;
}

export function deleteStudioService(id: string): boolean {
  const services = loadAllStudioServices();
  const next = services.filter((service) => service.id !== id);
  if (next.length === services.length) {
    return false;
  }

  persistStudioServices(next);

  void deleteServiceOfflineAware(id).then(() => {
    syncSnapshotFromStore();
    if (isBrowserOnline()) {
      void flushPendingServiceMutations();
    }
  });

  return true;
}

export function resetStudioServicesToDefaults(): StudioService[] {
  return persistStudioServices(DEFAULT_STUDIO_SERVICES);
}

export type ServiceSortField = "name" | "price";
export type ServiceSortDirection = "asc" | "desc";

export function sortStudioServices(
  services: StudioService[],
  field: ServiceSortField,
  direction: ServiceSortDirection,
): StudioService[] {
  const sorted = [...services].sort((a, b) => {
    if (field === "price") {
      return a.price - b.price;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return direction === "desc" ? sorted.reverse() : sorted;
}

export function filterStudioServices(services: StudioService[], query: string): StudioService[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return services;
  }

  return services.filter(
    (service) =>
      service.name.toLowerCase().includes(normalized) ||
      service.category.toLowerCase().includes(normalized) ||
      service.description.toLowerCase().includes(normalized),
  );
}

export function getMandatoryServiceIds(): string[] {
  return getActiveStudioServices()
    .filter((service) => service.mandatory)
    .map((service) => service.id);
}

export function initializeServiceSnapshots(): void {
  migrateLegacyServicesToStudioCache();
  hydrateServicesSnapshotFromCache();
  syncSnapshotFromStore();
}
