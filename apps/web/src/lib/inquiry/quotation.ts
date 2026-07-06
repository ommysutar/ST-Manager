import type {
  CustomServiceLine,
  InquiryWizardFormValues,
  QuotationBreakdown,
  ServicePricingTier,
  StudioService,
} from "./types";
import { STUDIO_RENT_SERVICE_ID } from "./constants";
import { getActiveStudioServices, getServicePrice } from "./services";

/** Quotation uses selected services, custom services, studio rent, and manual discount. */
export function calculateQuotation(
  form: Pick<
    InquiryWizardFormValues,
    | "selectedServiceIds"
    | "servicePricingTier"
    | "customServices"
    | "studioRentHours"
    | "studioDiscountPercent"
  >,
  services: StudioService[] = getActiveStudioServices(),
  tier: ServicePricingTier = form.servicePricingTier,
): QuotationBreakdown {
  const activeIds = new Set(services.filter((service) => service.active).map((service) => service.id));

  const serviceLines = services
    .filter(
      (service) =>
        activeIds.has(service.id) &&
        form.selectedServiceIds.includes(service.id) &&
        !service.isStudioRent,
    )
    .map((service) => ({
      id: service.id,
      name: service.name,
      price: getServicePrice(service, tier),
    }));

  const rentService = services.find(
    (service) => service.isStudioRent && activeIds.has(service.id),
  );
  const studioRentRate = rentService ? getServicePrice(rentService, tier) : 0;
  const studioRentHours = form.studioRentHours > 0 ? form.studioRentHours : 0;
  const studioRentAmount = Math.round(studioRentHours * studioRentRate);

  const customServiceLines: CustomServiceLine[] = (form.customServices ?? []).map((line) => ({
    id: line.id,
    name: line.name,
    price: line.price,
  }));

  const servicesSubtotal =
    serviceLines.reduce((sum, line) => sum + line.price, 0) +
    customServiceLines.reduce((sum, line) => sum + line.price, 0) +
    studioRentAmount;

  const subtotal = servicesSubtotal;
  const discountAmount = Math.round((subtotal * form.studioDiscountPercent) / 100);
  const grandTotal = subtotal - discountAmount;

  return {
    planAmount: 0,
    serviceLines,
    customServiceLines,
    studioRentHours,
    studioRentRate,
    studioRentAmount,
    servicesSubtotal,
    subtotal,
    discountAmount,
    grandTotal,
  };
}

export function calculateAdvance(grandTotal: number, advancePercent: number) {
  const advanceAmount = Math.round((grandTotal * advancePercent) / 100);
  const remainingBalance = grandTotal - advanceAmount;
  return { advanceAmount, remainingBalance };
}

export { generateId } from "./services";

export { STUDIO_RENT_SERVICE_ID };
