import type {
  CustomServiceLine,
  DiscountType,
  InquiryWizardFormValues,
  QuotationBreakdown,
  QuotationServiceLine,
  ServicePricingTier,
  StudioService,
} from "./types";
import { getActiveStudioServices, getServicePrice } from "./services";

function resolveDiscountAmount(
  subtotal: number,
  discountType: DiscountType,
  discountPercent: number,
  discountAmountInput: number,
): number {
  if (subtotal <= 0) {
    return 0;
  }

  if (discountType === "amount") {
    return Math.min(Math.max(0, discountAmountInput), subtotal);
  }

  const percent = Math.min(100, Math.max(0, discountPercent));
  return Math.round((subtotal * percent) / 100);
}

/** Quotation uses selected services, custom services, hourly rates, and discount. */
export function calculateQuotation(
  form: Pick<
    InquiryWizardFormValues,
    | "selectedServiceIds"
    | "servicePricingTier"
    | "customServices"
    | "serviceHours"
    | "studioRentHours"
    | "studioDiscountType"
    | "studioDiscountPercent"
    | "studioDiscountAmount"
  >,
  services: StudioService[] = getActiveStudioServices(),
  tier: ServicePricingTier = form.servicePricingTier,
): QuotationBreakdown {
  const activeIds = new Set(services.filter((service) => service.active).map((service) => service.id));
  const serviceHours = form.serviceHours ?? {};

  const serviceLines: QuotationServiceLine[] = services
    .filter(
      (service) =>
        activeIds.has(service.id) &&
        form.selectedServiceIds.includes(service.id),
    )
    .map((service) => {
      const rate = getServicePrice(service, tier);

      if (service.isStudioRent) {
        const legacyHours =
          serviceHours[service.id] ??
          (form.studioRentHours > 0 && form.selectedServiceIds.includes(service.id)
            ? form.studioRentHours
            : 0);
        const hours = legacyHours > 0 ? legacyHours : 0;
        const lineTotal = Math.round(rate * hours * 100) / 100;

        return {
          id: service.id,
          name: service.name,
          price: lineTotal,
          hourlyRate: rate,
          hours,
        };
      }

      return {
        id: service.id,
        name: service.name,
        price: rate,
      };
    });

  const customServiceLines: CustomServiceLine[] = (form.customServices ?? []).map((line) => ({
    id: line.id,
    name: line.name,
    price: line.price,
  }));

  const hourlyLines = serviceLines.filter((line) => line.hours != null && line.hours > 0);
  const studioRentHours = hourlyLines.reduce((sum, line) => sum + (line.hours ?? 0), 0);
  const studioRentAmount = hourlyLines.reduce((sum, line) => sum + line.price, 0);
  const studioRentRate =
    hourlyLines.length === 1 && hourlyLines[0].hourlyRate != null ? hourlyLines[0].hourlyRate : 0;

  const servicesSubtotal =
    serviceLines.reduce((sum, line) => sum + line.price, 0) +
    customServiceLines.reduce((sum, line) => sum + line.price, 0);

  const subtotal = servicesSubtotal;
  const discountAmount = resolveDiscountAmount(
    subtotal,
    form.studioDiscountType ?? "percent",
    form.studioDiscountPercent ?? 0,
    form.studioDiscountAmount ?? 0,
  );
  const grandTotal = Math.max(0, subtotal - discountAmount);

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

export { STUDIO_RENT_SERVICE_ID } from "./constants";
