import { ROUTES } from "@st-manager/constants";
import type {
  CreateInvoiceDto,
  CreateInvoiceResponseDto,
  GetInvoiceResponseDto,
  InvoiceResponseDto,
  ListInvoicesQueryDto,
  ListInvoicesResponseDto,
  MarkInvoicePaidResponseDto,
  SendInvoiceResponseDto,
  UpdateInvoiceDto,
  UpdateInvoiceResponseDto,
  VoidInvoiceResponseDto,
} from "@st-manager/contracts";
import { createInvoiceSchema, updateInvoiceSchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface InvoicesApi {
  createInvoice(input: CreateInvoiceDto): Promise<InvoiceResponseDto>;
  listInvoices(query?: ListInvoicesQueryDto): Promise<ListInvoicesResponseDto>;
  getInvoice(id: string): Promise<InvoiceResponseDto>;
  updateInvoice(id: string, input: UpdateInvoiceDto): Promise<InvoiceResponseDto>;
  sendInvoice(id: string): Promise<InvoiceResponseDto>;
  markInvoicePaid(id: string): Promise<InvoiceResponseDto>;
  voidInvoice(id: string): Promise<void>;
}

export function createInvoicesApi(client: HttpClient): InvoicesApi {
  return {
    createInvoice: async (input) => {
      const validated = createInvoiceSchema.parse(input);
      const response = await client.post<CreateInvoiceResponseDto>(ROUTES.INVOICES, validated);
      return response.data;
    },

    listInvoices: (query = {}) =>
      client.get<ListInvoicesResponseDto>(ROUTES.INVOICES, {
        status: query.status,
        clientId: query.clientId,
        sessionId: query.sessionId,
        page: query.page,
        pageSize: query.pageSize,
      }),

    getInvoice: async (id) => {
      const response = await client.get<GetInvoiceResponseDto>(`${ROUTES.INVOICES}/${id}`);
      return response.data;
    },

    updateInvoice: async (id, input) => {
      const validated = updateInvoiceSchema.parse(input);
      const response = await client.patch<UpdateInvoiceResponseDto>(
        `${ROUTES.INVOICES}/${id}`,
        validated,
      );
      return response.data;
    },

    sendInvoice: async (id) => {
      const response = await client.post<SendInvoiceResponseDto>(
        `${ROUTES.INVOICES}/${id}/send`,
        {},
      );
      return response.data;
    },

    markInvoicePaid: async (id) => {
      const response = await client.post<MarkInvoicePaidResponseDto>(
        `${ROUTES.INVOICES}/${id}/mark-paid`,
        {},
      );
      return response.data;
    },

    voidInvoice: async (id) => {
      await client.delete<VoidInvoiceResponseDto>(`${ROUTES.INVOICES}/${id}`);
    },
  };
}
