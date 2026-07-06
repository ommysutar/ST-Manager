import { DEFAULT_STUDIOS } from "./constants";
import type { StudioRoom } from "./types";

let studiosSnapshot: StudioRoom[] = DEFAULT_STUDIOS;

export function getStudiosSnapshot(): StudioRoom[] {
  return studiosSnapshot;
}

export function setStudiosSnapshot(next: StudioRoom[]): StudioRoom[] {
  studiosSnapshot = next;
  return studiosSnapshot;
}

export function getActiveStudiosSnapshot(): StudioRoom[] {
  return studiosSnapshot.filter((studio) => studio.active);
}
