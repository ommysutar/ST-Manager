import type { ServicePricingTier, ServicePrices, StudioService } from "./types";

export function normalizeServicePrices(raw: Partial<StudioService>): ServicePrices {
  if (raw.prices) {
    return {
      basic: Math.max(0, Math.round(raw.prices.basic)),
      standard: Math.max(0, Math.round(raw.prices.standard)),
      premium: Math.max(0, Math.round(raw.prices.premium)),
    };
  }

  const legacy = Math.max(0, Math.round(raw.price ?? 0));
  return { basic: legacy, standard: legacy, premium: legacy };
}

export function getServicePrice(service: StudioService, tier: ServicePricingTier): number {
  return service.prices[tier];
}
