import { PAGINATION } from "@st-manager/constants";
import { z } from "zod";

import type { CreateInvoiceDto, UpdateInvoiceDto } from "@st-manager/contracts";

const isoDateTime = z.string().datetime({ message: "Invalid ISO datetime" });

const invoiceStatus = z.enum(["draft", "sent", "paid", "void"]);

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

function optionalNullableNotes() {
  return z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value));
}

function optionalUpdateNotes() {
  return z
    .union([z.string().trim().max(2000), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .optional();
}

function optionalSessionId() {
  return z
    .string()
    .trim()
    .min(1)
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value));
}

export const createInvoiceSchema = z.object({
  clientId: z.string().trim().min(1),
  sessionId: optionalSessionId(),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.number().min(0).max(100).optional().default(0),
  dueDate: isoDateTime,
  notes: optionalNullableNotes(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type InvoiceLineItemInput = z.infer<typeof lineItemSchema>;

export const updateInvoiceSchema = z
  .object({
    clientId: z.string().trim().min(1).optional(),
    lineItems: z.array(lineItemSchema).min(1).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    dueDate: isoDateTime.optional(),
    notes: optionalUpdateNotes(),
  })
  .refine(
    (value) =>
      value.clientId !== undefined ||
      value.lineItems !== undefined ||
      value.taxRate !== undefined ||
      value.dueDate !== undefined ||
      value.notes !== undefined,
    { message: "At least one field is required" },
  );

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const listInvoicesQuerySchema = z.object({
  status: invoiceStatus.optional(),
  clientId: z.string().trim().min(1).optional(),
  sessionId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.MAX_PAGE_SIZE)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
});

export type ListInvoicesQueryInput = z.infer<typeof listInvoicesQuerySchema>;

export function computeInvoiceTotals(lineItems: InvoiceLineItemInput[], taxRate: number) {
  const subtotal = roundCurrency(
    lineItems.reduce((sum, item) => sum + item.amount, 0),
  );
  const tax = roundCurrency(subtotal * (taxRate / 100));
  const total = roundCurrency(subtotal + tax);

  return { subtotal, tax, total };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

const _createContractCheck: CreateInvoiceDto = {} as CreateInvoiceInput;
const _updateContractCheck: UpdateInvoiceDto = {} as UpdateInvoiceInput;
