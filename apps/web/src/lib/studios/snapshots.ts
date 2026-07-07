import { DEFAULT_STUDIOS } from "./constants";
import type { StudioRoom } from "./types";

let studiosSnapshot: StudioRoom[] = DEFAULT_STUDIOS;
let activeStudiosSnapshot: StudioRoom[] = DEFAULT_STUDIOS;

function studiosContentEqual(left: StudioRoom[], right: StudioRoom[]): boolean {
  return (
    left.length === right.length &&
    left.every(
      (studio, index) =>
        studio.id === right[index]?.id && studio.updatedAt === right[index]?.updatedAt,
    )
  );
}

function recomputeActiveStudiosSnapshot(): void {
  const nextActive = studiosSnapshot.filter((studio) => studio.active);

  if (
    activeStudiosSnapshot.length === nextActive.length &&
    activeStudiosSnapshot.every((studio, index) => studio === nextActive[index])
  ) {
    return;
  }

  activeStudiosSnapshot = nextActive;
}

recomputeActiveStudiosSnapshot();

export function getStudiosSnapshot(): StudioRoom[] {
  return studiosSnapshot;
}

export function setStudiosSnapshot(next: StudioRoom[]): StudioRoom[] {
  if (studiosSnapshot === next || studiosContentEqual(studiosSnapshot, next)) {
    return studiosSnapshot;
  }

  studiosSnapshot = next;
  recomputeActiveStudiosSnapshot();
  return studiosSnapshot;
}

/** Cached active subset — never filter inside getSnapshot (useSyncExternalStore requires stable refs). */
export function getActiveStudiosSnapshot(): StudioRoom[] {
  return activeStudiosSnapshot;
}
