import type { StudioServiceResponseDto } from "@st-manager/contracts";
import type { ServicePrices, StudioService } from "@st-manager/types";

export function toStudioServiceResponseDto(service: StudioService): StudioServiceResponseDto {
  return {
    id: service.id,
    studioId: service.studioId,
    name: service.name,
    category: service.category,
    description: service.description,
    active: service.active,
    mandatory: service.mandatory,
    isStudioRent: service.isStudioRent,
    sortOrder: service.sortOrder,
    legacyPrice: service.legacyPrice,
    prices: service.prices,
    deletedAt: service.deletedAt ? service.deletedAt.toISOString() : null,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

export function normalizeServicePrices(raw: unknown): ServicePrices {
  if (!raw || typeof raw !== "object") {
    return { basic: 0, standard: 0, premium: 0 };
  }

  const value = raw as Record<string, unknown>;
  return {
    basic: typeof value.basic === "number" ? value.basic : 0,
    standard: typeof value.standard === "number" ? value.standard : 0,
    premium: typeof value.premium === "number" ? value.premium : 0,
  };
}
