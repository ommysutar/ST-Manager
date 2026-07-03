export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  sessionId: string | null;
  number: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  dueDate: Date;
  issuedAt: Date | null;
  paidAt: Date | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceWithRelations extends Invoice {
  clientName: string;
  sessionTitle: string | null;
}
