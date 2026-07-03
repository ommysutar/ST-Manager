import type { SessionStatus } from "@st-manager/types";

export interface SessionResponseDto {
  id: string;
  studioId: string;
  studioName: string;
  clientId: string | null;
  clientName: string | null;
  bookingId: string | null;
  bookingTitle: string | null;
  title: string;
  startedAt: string;
  endedAt: string | null;
  status: SessionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
