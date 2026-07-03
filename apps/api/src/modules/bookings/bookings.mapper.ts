import type { BookingResponseDto } from "@st-manager/contracts";
import type { DashboardBookingSummaryDto } from "@st-manager/contracts";
import type { BookingWithRelations } from "@st-manager/types";

export function toBookingResponseDto(booking: BookingWithRelations): BookingResponseDto {
  return {
    id: booking.id,
    studioId: booking.studioId,
    studioName: booking.studioName,
    clientId: booking.clientId,
    clientName: booking.clientName,
    title: booking.title,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    status: booking.status,
    notes: booking.notes,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

export function toDashboardBookingSummaryDto(
  booking: BookingWithRelations,
): DashboardBookingSummaryDto {
  return {
    id: booking.id,
    title: booking.title,
    studioId: booking.studioId,
    studioName: booking.studioName,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
  };
}
