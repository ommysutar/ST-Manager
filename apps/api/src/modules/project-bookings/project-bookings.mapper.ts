import type { ProjectBookingResponseDto } from "@st-manager/contracts";
import type { ProjectBooking } from "@st-manager/types";

export function toProjectBookingResponseDto(
  booking: ProjectBooking,
): ProjectBookingResponseDto {
  const { payload, createdAt, updatedAt, deletedAt, ...rest } = booking;
  return {
    ...rest,
    ...payload,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    deletedAt: deletedAt ? deletedAt.toISOString() : null,
  };
}
