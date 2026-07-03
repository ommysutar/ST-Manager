import { ROUTES } from "@st-manager/constants";
import type {
  CreateInvoiceResponseDto,
  MarkInvoicePaidResponseDto,
  SendInvoiceResponseDto,
} from "@st-manager/contracts";
import { describe, expect, it, vi } from "vitest";

import type { HttpClient } from "../client/types";
import { createInvoicesApi } from "./invoices.api";

describe("createInvoicesApi", () => {
  it("creates an invoice via POST /invoices", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "invoice-1",
        clientId: "client-1",
        clientName: "Acme Records",
        sessionId: null,
        sessionTitle: null,
        number: "000001",
        status: "draft",
        lineItems: [
          {
            description: "Studio time",
            quantity: 1,
            unitPrice: 150,
            amount: 150,
          },
        ],
        subtotal: 150,
        taxRate: 0,
        tax: 0,
        total: 150,
        dueDate: "2026-07-10T00:00:00.000Z",
        issuedAt: null,
        paidAt: null,
        notes: null,
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    } satisfies CreateInvoiceResponseDto);

    const client: HttpClient = {
      get: vi.fn(),
      post,
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const invoicesApi = createInvoicesApi(client);

    await expect(
      invoicesApi.createInvoice({
        clientId: "client-1",
        lineItems: [
          {
            description: "Studio time",
            quantity: 1,
            unitPrice: 150,
            amount: 150,
          },
        ],
        dueDate: "2026-07-10T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({ id: "invoice-1", number: "000001" });

    expect(post).toHaveBeenCalledWith(ROUTES.INVOICES, {
      clientId: "client-1",
      sessionId: null,
      lineItems: [
        {
          description: "Studio time",
          quantity: 1,
          unitPrice: 150,
          amount: 150,
        },
      ],
      taxRate: 0,
      dueDate: "2026-07-10T00:00:00.000Z",
      notes: null,
    });
  });

  it("sends and marks an invoice paid", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "invoice-1",
        clientId: "client-1",
        clientName: "Acme Records",
        sessionId: null,
        sessionTitle: null,
        number: "000001",
        status: "sent",
        lineItems: [],
        subtotal: 150,
        taxRate: 0,
        tax: 0,
        total: 150,
        dueDate: "2026-07-10T00:00:00.000Z",
        issuedAt: "2026-07-03T12:00:00.000Z",
        paidAt: null,
        notes: null,
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    } satisfies SendInvoiceResponseDto);

    const client: HttpClient = {
      get: vi.fn(),
      post,
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const invoicesApi = createInvoicesApi(client);

    await invoicesApi.sendInvoice("invoice-1");
    expect(post).toHaveBeenCalledWith(`${ROUTES.INVOICES}/invoice-1/send`, {});

    post.mockResolvedValueOnce({
      success: true,
      data: {
        id: "invoice-1",
        clientId: "client-1",
        clientName: "Acme Records",
        sessionId: null,
        sessionTitle: null,
        number: "000001",
        status: "paid",
        lineItems: [],
        subtotal: 150,
        taxRate: 0,
        tax: 0,
        total: 150,
        dueDate: "2026-07-10T00:00:00.000Z",
        issuedAt: "2026-07-03T12:00:00.000Z",
        paidAt: "2026-07-03T13:00:00.000Z",
        notes: null,
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    } satisfies MarkInvoicePaidResponseDto);

    await invoicesApi.markInvoicePaid("invoice-1");
    expect(post).toHaveBeenCalledWith(`${ROUTES.INVOICES}/invoice-1/mark-paid`, {});
  });
});
