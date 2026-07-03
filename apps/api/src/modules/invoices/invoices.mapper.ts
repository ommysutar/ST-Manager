import type { InvoiceResponseDto } from "@st-manager/contracts";
import type { DashboardInvoiceSummaryDto } from "@st-manager/contracts";
import type { InvoiceLineItem, InvoiceWithRelations } from "@st-manager/types";

export function toInvoiceResponseDto(invoice: InvoiceWithRelations): InvoiceResponseDto {
  return {
    id: invoice.id,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    sessionId: invoice.sessionId,
    sessionTitle: invoice.sessionTitle,
    number: invoice.number,
    status: invoice.status,
    lineItems: invoice.lineItems,
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    tax: invoice.tax,
    total: invoice.total,
    dueDate: invoice.dueDate.toISOString(),
    issuedAt: invoice.issuedAt ? invoice.issuedAt.toISOString() : null,
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
    notes: invoice.notes,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export function toDashboardInvoiceSummaryDto(
  invoice: InvoiceWithRelations,
): DashboardInvoiceSummaryDto {
  return {
    id: invoice.id,
    number: invoice.number,
    clientName: invoice.clientName,
    total: invoice.total,
    status: invoice.status,
    dueDate: invoice.dueDate.toISOString(),
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
  };
}

export function parseLineItems(value: unknown): InvoiceLineItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    description: String((item as InvoiceLineItem).description),
    quantity: Number((item as InvoiceLineItem).quantity),
    unitPrice: Number((item as InvoiceLineItem).unitPrice),
    amount: Number((item as InvoiceLineItem).amount),
  }));
}
