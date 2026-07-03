import type { InvoiceLineItem, InvoiceStatus } from "@st-manager/types";

export interface InvoiceResponseDto {
  id: string;
  clientId: string;
  clientName: string;
  sessionId: string | null;
  sessionTitle: string | null;
  number: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  dueDate: string;
  issuedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
