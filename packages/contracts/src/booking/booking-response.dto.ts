import type { BookingStatus } from "@st-manager/types";

export interface BookingResponseDto {
  id: string;
  studioId: string;
  studioName: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
