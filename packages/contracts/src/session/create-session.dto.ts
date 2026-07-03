import type { SessionResponseDto } from "./session-response.dto";

export interface CreateSessionDto {
  studioId?: string;
  clientId?: string | null;
  bookingId?: string | null;
  title?: string;
  startedAt?: string;
  notes?: string | null;
}

export type CreateSessionResponseDto = {
  success: true;
  data: SessionResponseDto;
};
