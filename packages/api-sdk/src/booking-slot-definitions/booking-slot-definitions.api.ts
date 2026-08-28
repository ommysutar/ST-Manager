import { ROUTES } from "@st-manager/constants";
import type {
  CreateBookingSlotDefinitionDto,
  CreateBookingSlotDefinitionResponseDto,
  DeleteBookingSlotDefinitionResponseDto,
  GetBookingSlotDefinitionResponseDto,
  ListBookingSlotDefinitionsQueryDto,
  ListBookingSlotDefinitionsResponseDto,
  BookingSlotDefinitionResponseDto,
  SyncBookingSlotDefinitionsPullQueryDto,
  SyncBookingSlotDefinitionsPullResponseDto,
  UpdateBookingSlotDefinitionDto,
  UpdateBookingSlotDefinitionResponseDto,
} from "@st-manager/contracts";
import {
  createBookingSlotDefinitionSchema,
  updateBookingSlotDefinitionSchema,
} from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface BookingSlotDefinitionsApi {
  createBookingSlotDefinition(
    input: CreateBookingSlotDefinitionDto,
  ): Promise<BookingSlotDefinitionResponseDto>;
  listBookingSlotDefinitions(
    query?: ListBookingSlotDefinitionsQueryDto,
  ): Promise<ListBookingSlotDefinitionsResponseDto>;
  pullBookingSlotDefinitionChanges(
    query?: SyncBookingSlotDefinitionsPullQueryDto,
  ): Promise<SyncBookingSlotDefinitionsPullResponseDto["data"]>;
  getBookingSlotDefinition(id: string): Promise<BookingSlotDefinitionResponseDto>;
  updateBookingSlotDefinition(
    id: string,
    input: UpdateBookingSlotDefinitionDto,
  ): Promise<BookingSlotDefinitionResponseDto>;
  deleteBookingSlotDefinition(id: string): Promise<void>;
}

export function createBookingSlotDefinitionsApi(client: HttpClient): BookingSlotDefinitionsApi {
  return {
    createBookingSlotDefinition: async (input) => {
      const validated = createBookingSlotDefinitionSchema.parse(input);
      const response = await client.post<CreateBookingSlotDefinitionResponseDto>(
        ROUTES.BOOKING_SLOT_DEFINITIONS,
        validated,
      );
      return response.data;
    },

    listBookingSlotDefinitions: (query = {}) =>
      client.get<ListBookingSlotDefinitionsResponseDto>(ROUTES.BOOKING_SLOT_DEFINITIONS, {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
      }),

    pullBookingSlotDefinitionChanges: async (query = {}) => {
      const response = await client.get<SyncBookingSlotDefinitionsPullResponseDto>(
        `${ROUTES.BOOKING_SLOT_DEFINITIONS}/changes`,
        { since: query.since },
      );
      return response.data;
    },

    getBookingSlotDefinition: async (id) => {
      const response = await client.get<GetBookingSlotDefinitionResponseDto>(
        `${ROUTES.BOOKING_SLOT_DEFINITIONS}/${id}`,
      );
      return response.data;
    },

    updateBookingSlotDefinition: async (id, input) => {
      const validated = updateBookingSlotDefinitionSchema.parse(input);
      const response = await client.patch<UpdateBookingSlotDefinitionResponseDto>(
        `${ROUTES.BOOKING_SLOT_DEFINITIONS}/${id}`,
        validated,
      );
      return response.data;
    },

    deleteBookingSlotDefinition: async (id) => {
      await client.delete<DeleteBookingSlotDefinitionResponseDto>(
        `${ROUTES.BOOKING_SLOT_DEFINITIONS}/${id}`,
      );
    },
  };
}
