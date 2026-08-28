import type { StudioRoom } from "@st-manager/types";

export interface StudioRoomResponseDto
  extends Omit<StudioRoom, "createdAt" | "updatedAt" | "deletedAt"> {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
