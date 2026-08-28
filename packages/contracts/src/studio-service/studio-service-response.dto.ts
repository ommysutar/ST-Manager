import type { StudioService } from "@st-manager/types";

export interface StudioServiceResponseDto
  extends Omit<StudioService, "createdAt" | "updatedAt" | "deletedAt"> {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
