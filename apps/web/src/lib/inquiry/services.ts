import { DEFAULT_STUDIO_SERVICES } from "./constants";
import { notifyServicePricingUpdated } from "./events";
import { getServicePrice, normalizeServicePrices } from "./service-pricing";
import { setAllServicesSnapshot } from "./snapshots";
import type { StudioService } from "./types";
import { SERVICE_PRICING_STORAGE_KEY } from "./types";

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

export function loadAllStudioServices(): StudioService[] {
  return readServicesFromStorage();
}

export function getActiveStudioServices(): StudioService[] {
  return loadAllStudioServices().filter((service) => service.active);
}

export function persistStudioServices(services: StudioService[]): StudioService[] {
  const normalized = services.map((service) => normalizeService(service));
  localStorage.setItem(SERVICE_PRICING_STORAGE_KEY, JSON.stringify(normalized));
  setAllServicesSnapshot(normalized);
  notifyServicePricingUpdated();
  return normalized;
}

export function createStudioService(
  input: Omit<StudioService, "id">,
): StudioService {
  const service = normalizeService({
    id: generateId("svc"),
    ...input,
  });
  persistStudioServices([service, ...loadAllStudioServices()]);
  return service;
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
  return updated;
}

export function deleteStudioService(id: string): boolean {
  const services = loadAllStudioServices();
  const next = services.filter((service) => service.id !== id);
  if (next.length === services.length) {
    return false;
  }

  persistStudioServices(next);
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
  setAllServicesSnapshot(readServicesFromStorage());
}

function readServicesFromStorage(): StudioService[] {
  if (typeof window === "undefined") {
    return DEFAULT_STUDIO_SERVICES;
  }

  try {
    const raw = localStorage.getItem(SERVICE_PRICING_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STUDIO_SERVICES;
    }

    const parsed = JSON.parse(raw) as Partial<StudioService>[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_STUDIO_SERVICES;
    }

    return parsed.map((service) => normalizeService(service as StudioService));
  } catch {
    return DEFAULT_STUDIO_SERVICES;
  }
}
