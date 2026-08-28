import type { PaginatedResponseDto } from "../common/pagination.dto";
import type { InquiryResponseDto } from "./inquiry-response.dto";

export interface ListInquiriesQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
}

export type ListInquiriesResponseDto = PaginatedResponseDto<InquiryResponseDto>;

export type CreateInquiryResponseDto = {
  success: true;
  data: InquiryResponseDto;
};

export type UpdateInquiryResponseDto = {
  success: true;
  data: InquiryResponseDto;
};

export type GetInquiryResponseDto = {
  success: true;
  data: InquiryResponseDto;
};

export type DeleteInquiryResponseDto = {
  success: true;
};

/** Incremental Inquiry API sync pull (studio-scoped; includes soft-deletes). */
export interface SyncInquiriesPullQueryDto {
  since?: string;
}

export interface SyncInquiriesPullResponseDataDto {
  records: InquiryResponseDto[];
  serverTime: string;
  hasMore: boolean;
}

export type SyncInquiriesPullResponseDto = {
  success: true;
  data: SyncInquiriesPullResponseDataDto;
};
