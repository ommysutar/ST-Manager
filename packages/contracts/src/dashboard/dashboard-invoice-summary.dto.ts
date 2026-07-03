import type { InvoiceStatus } from "@st-manager/types";

export interface DashboardInvoiceSummaryDto {
  id: string;
  number: string;
  clientName: string;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt: string | null;
}
