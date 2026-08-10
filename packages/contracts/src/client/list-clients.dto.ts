import type { PaginatedResponseDto } from "../common/pagination.dto";
import type { ClientResponseDto } from "./client-response.dto";

export interface ListClientsQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
}

export type ListClientsResponseDto = PaginatedResponseDto<ClientResponseDto>;

export type CreateClientResponseDto = {
  success: true;
  data: ClientResponseDto;
};

export type UpdateClientResponseDto = {
  success: true;
  data: ClientResponseDto;
};

export type GetClientResponseDto = {
  success: true;
  data: ClientResponseDto;
};

export type DeleteClientResponseDto = {
  success: true;
};

/** Incremental Client API sync pull (studio-scoped; includes soft-deletes). */
export interface SyncClientsPullQueryDto {
  since?: string;
}

export interface SyncClientsPullResponseDataDto {
  records: ClientResponseDto[];
  serverTime: string;
  hasMore: boolean;
}

export type SyncClientsPullResponseDto = {
  success: true;
  data: SyncClientsPullResponseDataDto;
};
