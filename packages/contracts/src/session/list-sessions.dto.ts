import type { SessionResponseDto } from "./session-response.dto";

export interface UpdateSessionDto {
  studioId?: string;
  clientId?: string | null;
  title?: string;
  startedAt?: string;
  notes?: string | null;
}

export interface ListSessionsQueryDto {
  studioId?: string;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  bookingId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export type ListSessionsResponseDto = {
  success: true;
  data: SessionResponseDto[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type UpdateSessionResponseDto = {
  success: true;
  data: SessionResponseDto;
};

export type GetSessionResponseDto = {
  success: true;
  data: SessionResponseDto;
};

export type StartSessionResponseDto = {
  success: true;
  data: SessionResponseDto;
};

export type CompleteSessionResponseDto = {
  success: true;
  data: SessionResponseDto;
};

export type CancelSessionResponseDto = {
  success: true;
};
