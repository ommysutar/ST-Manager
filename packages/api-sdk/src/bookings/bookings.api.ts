import { ROUTES } from "@st-manager/constants";
import type {
  BookingResponseDto,
  CancelBookingResponseDto,
  CreateBookingResponseDto,
  GetBookingResponseDto,
  ListBookingsQueryDto,
  ListBookingsResponseDto,
  UpdateBookingDto,
  UpdateBookingResponseDto,
} from "@st-manager/contracts";
import type { CreateBookingDto } from "@st-manager/contracts";
import { createBookingSchema, updateBookingSchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface BookingsApi {
  createBooking(input: CreateBookingDto): Promise<BookingResponseDto>;
  listBookings(query: ListBookingsQueryDto): Promise<ListBookingsResponseDto>;
  getBooking(id: string): Promise<BookingResponseDto>;
  updateBooking(id: string, input: UpdateBookingDto): Promise<BookingResponseDto>;
  cancelBooking(id: string): Promise<void>;
}

export function createBookingsApi(client: HttpClient): BookingsApi {
  return {
    createBooking: async (input) => {
      const validated = createBookingSchema.parse(input);
      const response = await client.post<CreateBookingResponseDto>(ROUTES.BOOKINGS, validated);
      return response.data;
    },

    listBookings: (query) =>
      client.get<ListBookingsResponseDto>(ROUTES.BOOKINGS, {
        studioId: query.studioId,
        from: query.from,
        to: query.to,
      }),

    getBooking: async (id) => {
      const response = await client.get<GetBookingResponseDto>(`${ROUTES.BOOKINGS}/${id}`);
      return response.data;
    },

    updateBooking: async (id, input) => {
      const validated = updateBookingSchema.parse(input);
      const response = await client.patch<UpdateBookingResponseDto>(
        `${ROUTES.BOOKINGS}/${id}`,
        validated,
      );
      return response.data;
    },

    cancelBooking: async (id) => {
      await client.delete<CancelBookingResponseDto>(`${ROUTES.BOOKINGS}/${id}`);
    },
  };
}
