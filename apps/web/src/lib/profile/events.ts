export const PROFILE_UPDATED_EVENT = "st-manager-profile-updated";

export function notifyProfileUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
  }
}
