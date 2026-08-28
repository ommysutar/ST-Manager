import type { PaginatedResponseDto } from "../common/pagination.dto";
import type { ProjectBookingResponseDto } from "./project-booking-response.dto";

export interface ListProjectBookingsQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
}

export type ListProjectBookingsResponseDto = PaginatedResponseDto<ProjectBookingResponseDto>;

export type CreateProjectBookingResponseDto = {
  success: true;
  data: ProjectBookingResponseDto;
};

export type UpdateProjectBookingResponseDto = {
  success: true;
  data: ProjectBookingResponseDto;
};

export type GetProjectBookingResponseDto = {
  success: true;
  data: ProjectBookingResponseDto;
};

export type DeleteProjectBookingResponseDto = {
  success: true;
};

/** Incremental Project Booking API sync pull (studio-scoped; includes soft-deletes). */
export interface SyncProjectBookingsPullQueryDto {
  since?: string;
}

export interface SyncProjectBookingsPullResponseDataDto {
  records: ProjectBookingResponseDto[];
  serverTime: string;
  hasMore: boolean;
}

export type SyncProjectBookingsPullResponseDto = {
  success: true;
  data: SyncProjectBookingsPullResponseDataDto;
};
