export const INQUIRIES_UPDATED_EVENT = "st-manager-inquiries-updated";
export const PROJECTS_UPDATED_EVENT = "st-manager-projects-updated";
export const SERVICE_PRICING_UPDATED_EVENT = "st-manager-service-pricing-updated";

export function notifyInquiriesUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INQUIRIES_UPDATED_EVENT));
  }
}

export function notifyProjectsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROJECTS_UPDATED_EVENT));
  }
}

export function notifyServicePricingUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SERVICE_PRICING_UPDATED_EVENT));
  }
}
