import type { BookingResponseDto } from "./booking-response.dto";

export interface ListBookingsQueryDto {
  studioId: string;
  from: string;
  to: string;
}

export type ListBookingsResponseDto = {
  success: true;
  data: BookingResponseDto[];
};

export type CreateBookingResponseDto = {
  success: true;
  data: BookingResponseDto;
};

export type UpdateBookingResponseDto = {
  success: true;
  data: BookingResponseDto;
};

export type GetBookingResponseDto = {
  success: true;
  data: BookingResponseDto;
};

export type CancelBookingResponseDto = {
  success: true;
};
