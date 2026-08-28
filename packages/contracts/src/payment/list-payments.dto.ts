import type { PaginatedResponseDto } from "../common/pagination.dto";
import type { PaymentResponseDto } from "./payment-response.dto";

export interface ListPaymentsQueryDto {
  page?: number;
  pageSize?: number;
  search?: string;
}

export type ListPaymentsResponseDto = PaginatedResponseDto<PaymentResponseDto>;

export type CreatePaymentResponseDto = {
  success: true;
  data: PaymentResponseDto;
};

export type UpdatePaymentResponseDto = {
  success: true;
  data: PaymentResponseDto;
};

export type GetPaymentResponseDto = {
  success: true;
  data: PaymentResponseDto;
};

export type DeletePaymentResponseDto = {
  success: true;
};

/** Incremental Payment API sync pull (studio-scoped; includes soft-deletes). */
export interface SyncPaymentsPullQueryDto {
  since?: string;
}

export interface SyncPaymentsPullResponseDataDto {
  records: PaymentResponseDto[];
  serverTime: string;
  hasMore: boolean;
}

export type SyncPaymentsPullResponseDto = {
  success: true;
  data: SyncPaymentsPullResponseDataDto;
};
