import type { InvoiceLineItem } from "@st-manager/types";

import type { InvoiceResponseDto } from "./invoice-response.dto";

export interface CreateInvoiceDto {
  clientId: string;
  sessionId?: string | null;
  lineItems: InvoiceLineItem[];
  taxRate?: number;
  dueDate: string;
  notes?: string | null;
}

export type CreateInvoiceResponseDto = {
  success: true;
  data: InvoiceResponseDto;
};
