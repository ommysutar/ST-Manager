import type { PaginatedResponseDto } from "../common/pagination.dto";
import type { StudioServiceResponseDto } from "./studio-service-response.dto";

export interface ListStudioServicesQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
}

export type ListStudioServicesResponseDto = PaginatedResponseDto<StudioServiceResponseDto>;

export type CreateStudioServiceResponseDto = {
  success: true;
  data: StudioServiceResponseDto;
};

export type UpdateStudioServiceResponseDto = {
  success: true;
  data: StudioServiceResponseDto;
};

export type GetStudioServiceResponseDto = {
  success: true;
  data: StudioServiceResponseDto;
};

export type DeleteStudioServiceResponseDto = {
  success: true;
};

/** Incremental studio service sync pull (studio-scoped; includes soft-deletes). */
export interface SyncStudioServicesPullQueryDto {
  since?: string;
}

export interface SyncStudioServicesPullResponseDataDto {
  records: StudioServiceResponseDto[];
  serverTime: string;
  hasMore: boolean;
}

export type SyncStudioServicesPullResponseDto = {
  success: true;
  data: SyncStudioServicesPullResponseDataDto;
};
