import type { StudioProfile } from "./types";

let profileSnapshot: StudioProfile | null = null;

export function getProfileSnapshot(): StudioProfile | null {
  return profileSnapshot;
}

export function setProfileSnapshot(next: StudioProfile | null): StudioProfile | null {
  profileSnapshot = next;
  return profileSnapshot;
}
