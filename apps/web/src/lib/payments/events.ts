export const PAYMENTS_UPDATED_EVENT = "st-manager-payments-updated";

export function notifyPaymentsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PAYMENTS_UPDATED_EVENT));
  }
}
