import type { ServicePrices } from "@st-manager/types";

export interface CreateStudioServiceDto {
  name: string;
  category?: string;
  description?: string;
  active?: boolean;
  mandatory?: boolean;
  isStudioRent?: boolean;
  sortOrder?: number;
  legacyPrice?: number;
  prices: ServicePrices;
}
