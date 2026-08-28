import type { PaginatedResponseDto } from "../common/pagination.dto";
import type { StudioDocumentResponseDto } from "./studio-document-response.dto";

export interface ListStudioDocumentsQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
}

export type ListStudioDocumentsResponseDto = PaginatedResponseDto<StudioDocumentResponseDto>;

export type CreateStudioDocumentResponseDto = {
  success: true;
  data: StudioDocumentResponseDto;
};

export type UpdateStudioDocumentResponseDto = {
  success: true;
  data: StudioDocumentResponseDto;
};

export type GetStudioDocumentResponseDto = {
  success: true;
  data: StudioDocumentResponseDto;
};

export type DeleteStudioDocumentResponseDto = {
  success: true;
};

/** Incremental StudioDocument API sync pull (studio-scoped; includes soft-deletes). */
export interface SyncStudioDocumentsPullQueryDto {
  since?: string;
}

export interface SyncStudioDocumentsPullResponseDataDto {
  records: StudioDocumentResponseDto[];
  serverTime: string;
  hasMore: boolean;
}

export type SyncStudioDocumentsPullResponseDto = {
  success: true;
  data: SyncStudioDocumentsPullResponseDataDto;
};
