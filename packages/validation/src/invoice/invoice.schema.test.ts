import { describe, expect, it } from "vitest";

import {
  computeInvoiceTotals,
  createInvoiceSchema,
  listInvoicesQuerySchema,
  updateInvoiceSchema,
} from "./invoice.schema";

describe("createInvoiceSchema", () => {
  it("accepts a valid invoice payload", () => {
    const result = createInvoiceSchema.parse({
      clientId: "client-1",
      lineItems: [
        {
          description: "Studio time",
          quantity: 2,
          unitPrice: 150,
          amount: 300,
        },
      ],
      taxRate: 10,
      dueDate: "2026-07-10T00:00:00.000Z",
    });

    expect(result.clientId).toBe("client-1");
    expect(result.sessionId).toBeNull();
    expect(result.taxRate).toBe(10);
  });

  it("rejects empty line items", () => {
    expect(() =>
      createInvoiceSchema.parse({
        clientId: "client-1",
        lineItems: [],
        dueDate: "2026-07-10T00:00:00.000Z",
      }),
    ).toThrow();
  });
});

describe("updateInvoiceSchema", () => {
  it("requires at least one field", () => {
    expect(() => updateInvoiceSchema.parse({})).toThrow();
  });

  it("accepts a notes update", () => {
    expect(updateInvoiceSchema.parse({ notes: "Updated" }).notes).toBe("Updated");
  });
});

describe("listInvoicesQuerySchema", () => {
  it("defaults pagination", () => {
    expect(listInvoicesQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
    });
  });
});

describe("computeInvoiceTotals", () => {
  it("calculates subtotal, tax, and total", () => {
    expect(
      computeInvoiceTotals(
        [{ description: "Studio time", quantity: 1, unitPrice: 100, amount: 100 }],
        10,
      ),
    ).toEqual({
      subtotal: 100,
      tax: 10,
      total: 110,
    });
  });
});
