import type { PaginatedResponseDto } from "../common/pagination.dto";
import type { BookingSlotDefinitionResponseDto } from "./booking-slot-definition-response.dto";

export interface ListBookingSlotDefinitionsQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
}

export type ListBookingSlotDefinitionsResponseDto =
  PaginatedResponseDto<BookingSlotDefinitionResponseDto>;

export type CreateBookingSlotDefinitionResponseDto = {
  success: true;
  data: BookingSlotDefinitionResponseDto;
};

export type UpdateBookingSlotDefinitionResponseDto = {
  success: true;
  data: BookingSlotDefinitionResponseDto;
};

export type GetBookingSlotDefinitionResponseDto = {
  success: true;
  data: BookingSlotDefinitionResponseDto;
};

export type DeleteBookingSlotDefinitionResponseDto = {
  success: true;
};

/** Incremental booking slot definition sync pull (studio-scoped; includes soft-deletes). */
export interface SyncBookingSlotDefinitionsPullQueryDto {
  since?: string;
}

export interface SyncBookingSlotDefinitionsPullResponseDataDto {
  records: BookingSlotDefinitionResponseDto[];
  serverTime: string;
  hasMore: boolean;
}

export type SyncBookingSlotDefinitionsPullResponseDto = {
  success: true;
  data: SyncBookingSlotDefinitionsPullResponseDataDto;
};
