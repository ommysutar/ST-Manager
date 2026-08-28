import type {
  CreateStudioServiceDto,
  StudioServiceResponseDto,
  UpdateStudioServiceDto,
} from "@st-manager/contracts";

import { normalizeServicePrices } from "@/lib/inquiry/service-pricing";
import type { StudioService } from "@/lib/inquiry/types";

export function dtoToStudioService(dto: StudioServiceResponseDto): StudioService {
  const prices = normalizeServicePrices({
    prices: dto.prices,
    price: dto.legacyPrice,
  });
  return {
    id: dto.id,
    name: dto.name?.trim() || "Untitled Service",
    price: prices.standard,
    prices,
    category: dto.category?.trim() ?? "",
    description: dto.description?.trim() ?? "",
    active: dto.active ?? true,
    mandatory: dto.mandatory ?? false,
    isStudioRent: dto.isStudioRent ?? false,
  };
}

export function studioServiceToCreateDto(
  service: Omit<StudioService, "id">,
  sortOrder = 0,
): CreateStudioServiceDto {
  const prices = normalizeServicePrices(service);
  return {
    name: service.name,
    category: service.category,
    description: service.description,
    active: service.active,
    mandatory: service.mandatory,
    isStudioRent: service.isStudioRent ?? false,
    sortOrder,
    legacyPrice: prices.standard,
    prices,
  };
}

export function studioServicePatchToUpdateDto(
  patch: Partial<Omit<StudioService, "id">>,
): UpdateStudioServiceDto {
  const dto: UpdateStudioServiceDto = {};
  if (patch.name !== undefined) dto.name = patch.name;
  if (patch.category !== undefined) dto.category = patch.category;
  if (patch.description !== undefined) dto.description = patch.description;
  if (patch.active !== undefined) dto.active = patch.active;
  if (patch.mandatory !== undefined) dto.mandatory = patch.mandatory;
  if (patch.isStudioRent !== undefined) dto.isStudioRent = patch.isStudioRent;
  if (patch.prices !== undefined || patch.price !== undefined) {
    const prices = normalizeServicePrices(patch);
    dto.prices = prices;
    dto.legacyPrice = prices.standard;
  }
  return dto;
}

export function studioServiceToResponseDto(
  service: StudioService,
  studioId: string,
): StudioServiceResponseDto {
  const prices = normalizeServicePrices(service);
  const now = new Date().toISOString();
  return {
    id: service.id,
    studioId,
    name: service.name,
    category: service.category,
    description: service.description,
    active: service.active,
    mandatory: service.mandatory,
    isStudioRent: service.isStudioRent ?? false,
    sortOrder: 0,
    legacyPrice: prices.standard,
    prices,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
