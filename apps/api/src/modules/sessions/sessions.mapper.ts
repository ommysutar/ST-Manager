import type { SessionResponseDto } from "@st-manager/contracts";
import type { DashboardSessionSummaryDto } from "@st-manager/contracts";
import type { SessionWithRelations } from "@st-manager/types";

export function toSessionResponseDto(session: SessionWithRelations): SessionResponseDto {
  return {
    id: session.id,
    studioId: session.studioId,
    studioName: session.studioName,
    clientId: session.clientId,
    clientName: session.clientName,
    bookingId: session.bookingId,
    bookingTitle: session.bookingTitle,
    title: session.title,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    status: session.status,
    notes: session.notes,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function toDashboardSessionSummaryDto(
  session: SessionWithRelations,
): DashboardSessionSummaryDto {
  return {
    id: session.id,
    title: session.title,
    studioId: session.studioId,
    studioName: session.studioName,
    clientName: session.clientName,
    startedAt: session.startedAt.toISOString(),
    status: session.status,
  };
}
