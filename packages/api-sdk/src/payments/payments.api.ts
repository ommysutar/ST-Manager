import { ROUTES } from "@st-manager/constants";
import type {
  CreatePaymentDto,
  CreatePaymentResponseDto,
  DeletePaymentResponseDto,
  GetPaymentResponseDto,
  ListPaymentsQueryDto,
  ListPaymentsResponseDto,
  PaymentResponseDto,
  SyncPaymentsPullQueryDto,
  SyncPaymentsPullResponseDto,
  UpdatePaymentDto,
  UpdatePaymentResponseDto,
} from "@st-manager/contracts";
import { createPaymentSchema, updatePaymentSchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface PaymentsApi {
  createPayment(input: CreatePaymentDto): Promise<PaymentResponseDto>;
  listPayments(query?: ListPaymentsQueryDto): Promise<ListPaymentsResponseDto>;
  pullPaymentChanges(
    query?: SyncPaymentsPullQueryDto,
  ): Promise<SyncPaymentsPullResponseDto["data"]>;
  getPayment(id: string): Promise<PaymentResponseDto>;
  updatePayment(id: string, input: UpdatePaymentDto): Promise<PaymentResponseDto>;
  deletePayment(id: string): Promise<void>;
}

export function createPaymentsApi(client: HttpClient): PaymentsApi {
  return {
    createPayment: async (input) => {
      const validated = createPaymentSchema.parse(input);
      const response = await client.post<CreatePaymentResponseDto>(ROUTES.PAYMENTS, validated);
      return response.data;
    },

    listPayments: (query = {}) =>
      client.get<ListPaymentsResponseDto>(ROUTES.PAYMENTS, {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
      }),

    pullPaymentChanges: async (query = {}) => {
      const response = await client.get<SyncPaymentsPullResponseDto>(
        `${ROUTES.PAYMENTS}/changes`,
        { since: query.since },
      );
      return response.data;
    },

    getPayment: async (id) => {
      const response = await client.get<GetPaymentResponseDto>(`${ROUTES.PAYMENTS}/${id}`);
      return response.data;
    },

    updatePayment: async (id, input) => {
      const validated = updatePaymentSchema.parse(input);
      const response = await client.patch<UpdatePaymentResponseDto>(
        `${ROUTES.PAYMENTS}/${id}`,
        validated,
      );
      return response.data;
    },

    deletePayment: async (id) => {
      await client.delete<DeletePaymentResponseDto>(`${ROUTES.PAYMENTS}/${id}`);
    },
  };
}
