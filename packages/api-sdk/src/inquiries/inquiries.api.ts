import { ROUTES } from "@st-manager/constants";
import type {
  CreateInquiryDto,
  CreateInquiryResponseDto,
  DeleteInquiryResponseDto,
  GetInquiryResponseDto,
  InquiryResponseDto,
  ListInquiriesQueryDto,
  ListInquiriesResponseDto,
  SyncInquiriesPullQueryDto,
  SyncInquiriesPullResponseDto,
  UpdateInquiryDto,
  UpdateInquiryResponseDto,
} from "@st-manager/contracts";
import {
  createInquirySchema,
  serializeInquiryRequestBody,
  updateInquirySchema,
} from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface InquiriesApi {
  createInquiry(input: CreateInquiryDto): Promise<InquiryResponseDto>;
  listInquiries(query?: ListInquiriesQueryDto): Promise<ListInquiriesResponseDto>;
  pullInquiryChanges(
    query?: SyncInquiriesPullQueryDto,
  ): Promise<SyncInquiriesPullResponseDto["data"]>;
  getInquiry(id: string): Promise<InquiryResponseDto>;
  updateInquiry(id: string, input: UpdateInquiryDto): Promise<InquiryResponseDto>;
  deleteInquiry(id: string): Promise<void>;
}

export function createInquiriesApi(client: HttpClient): InquiriesApi {
  return {
    createInquiry: async (input) => {
      const validated = createInquirySchema.parse(input);
      const response = await client.post<CreateInquiryResponseDto>(
        ROUTES.INQUIRIES,
        serializeInquiryRequestBody(validated),
      );
      return response.data;
    },

    listInquiries: (query = {}) =>
      client.get<ListInquiriesResponseDto>(ROUTES.INQUIRIES, {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
      }),

    pullInquiryChanges: async (query = {}) => {
      const response = await client.get<SyncInquiriesPullResponseDto>(
        `${ROUTES.INQUIRIES}/changes`,
        {
          since: query.since,
        },
      );
      return response.data;
    },

    getInquiry: async (id) => {
      const response = await client.get<GetInquiryResponseDto>(`${ROUTES.INQUIRIES}/${id}`);
      return response.data;
    },

    updateInquiry: async (id, input) => {
      const validated = updateInquirySchema.parse(input);
      const response = await client.patch<UpdateInquiryResponseDto>(
        `${ROUTES.INQUIRIES}/${id}`,
        serializeInquiryRequestBody(validated),
      );
      return response.data;
    },

    deleteInquiry: async (id) => {
      await client.delete<DeleteInquiryResponseDto>(`${ROUTES.INQUIRIES}/${id}`);
    },
  };
}
