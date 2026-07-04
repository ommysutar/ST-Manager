import type { InquiryWizardFormValues, ProjectPlan, QuotationBreakdown, StudioService } from "./types";
import { getActiveProjectPlans } from "./plans";
import { getActiveStudioServices } from "./services";

/** @deprecated Use loadAllStudioServices from ./services */
export function getStudioServices(): StudioService[] {
  return getActiveStudioServices();
}

/** @deprecated Use persistStudioServices from ./services */
export { persistStudioServices as saveStudioServices } from "./services";

export function calculateQuotation(
  form: Pick<InquiryWizardFormValues, "planId" | "selectedServiceIds" | "studioDiscountPercent">,
  services: StudioService[] = getActiveStudioServices(),
  plans: ProjectPlan[] = getActiveProjectPlans(),
): QuotationBreakdown {
  const plan = form.planId ? plans.find((entry) => entry.id === form.planId) : undefined;
  const planAmount = plan?.price ?? 0;

  const activeIds = new Set(services.filter((service) => service.active).map((service) => service.id));
  const serviceLines = services
    .filter((service) => activeIds.has(service.id) && form.selectedServiceIds.includes(service.id))
    .map((service) => ({ id: service.id, name: service.name, price: service.price }));

  const servicesSubtotal = serviceLines.reduce((sum, line) => sum + line.price, 0);
  const subtotal = planAmount + servicesSubtotal;
  const discountAmount = Math.round((subtotal * form.studioDiscountPercent) / 100);
  const grandTotal = subtotal - discountAmount;

  return {
    planAmount,
    serviceLines,
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
