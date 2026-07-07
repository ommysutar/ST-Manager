export const CLIENTS_UPDATED_EVENT = "st-manager-clients-updated";

export function notifyClientsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CLIENTS_UPDATED_EVENT));
  }
}
