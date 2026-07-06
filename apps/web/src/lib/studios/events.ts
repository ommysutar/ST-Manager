export const STUDIOS_UPDATED_EVENT = "st-manager-studios-updated";

export function notifyStudiosUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STUDIOS_UPDATED_EVENT));
  }
}
