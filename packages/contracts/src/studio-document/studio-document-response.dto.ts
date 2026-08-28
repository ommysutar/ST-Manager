import type { StudioDocument } from "@st-manager/types";

export interface StudioDocumentResponseDto
  extends Omit<StudioDocument, "createdAt" | "updatedAt" | "deletedAt"> {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
