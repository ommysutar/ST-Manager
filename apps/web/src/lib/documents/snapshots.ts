import type { StudioDocument } from "./types";

let documentsSnapshot: StudioDocument[] = [];

export function getDocumentsSnapshot(): StudioDocument[] {
  return documentsSnapshot;
}

export function setDocumentsSnapshot(next: StudioDocument[]): StudioDocument[] {
  documentsSnapshot = next;
  return documentsSnapshot;
}
