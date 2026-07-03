import type { InvoiceLineItem } from "@st-manager/types";

import type { InvoiceResponseDto } from "./invoice-response.dto";

export interface UpdateInvoiceDto {
  clientId?: string;
  lineItems?: InvoiceLineItem[];
  taxRate?: number;
  dueDate?: string;
  notes?: string | null;
}

export interface ListInvoicesQueryDto {
  status?: "draft" | "sent" | "paid" | "void";
  clientId?: string;
  sessionId?: string;
  page?: number;
  pageSize?: number;
}

export type ListInvoicesResponseDto = {
  success: true;
  data: InvoiceResponseDto[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type GetInvoiceResponseDto = {
  success: true;
  data: InvoiceResponseDto;
};

export type UpdateInvoiceResponseDto = {
  success: true;
  data: InvoiceResponseDto;
};

export type SendInvoiceResponseDto = {
  success: true;
  data: InvoiceResponseDto;
};

export type MarkInvoicePaidResponseDto = {
  success: true;
  data: InvoiceResponseDto;
};

export type VoidInvoiceResponseDto = {
  success: true;
};
