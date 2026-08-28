import type { PaginatedResponseDto } from "../common/pagination.dto";
import type { StudioRoomResponseDto } from "./studio-room-response.dto";

export interface ListStudioRoomsQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
}

export type ListStudioRoomsResponseDto = PaginatedResponseDto<StudioRoomResponseDto>;

export type CreateStudioRoomResponseDto = {
  success: true;
  data: StudioRoomResponseDto;
};

export type UpdateStudioRoomResponseDto = {
  success: true;
  data: StudioRoomResponseDto;
};

export type GetStudioRoomResponseDto = {
  success: true;
  data: StudioRoomResponseDto;
};

export type DeleteStudioRoomResponseDto = {
  success: true;
};

/** Incremental studio room sync pull (studio-scoped; includes soft-deletes). */
export interface SyncStudioRoomsPullQueryDto {
  since?: string;
}

export interface SyncStudioRoomsPullResponseDataDto {
  records: StudioRoomResponseDto[];
  serverTime: string;
  hasMore: boolean;
}

export type SyncStudioRoomsPullResponseDto = {
  success: true;
  data: SyncStudioRoomsPullResponseDataDto;
};
