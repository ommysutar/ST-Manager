import type { DashboardClientSummaryDto } from "@st-manager/contracts";
import type { ClientResponseDto } from "@st-manager/contracts";
import type { Client } from "@st-manager/types";

export function toClientResponseDto(client: Client): ClientResponseDto {
  return {
    id: client.id,
    studioId: client.studioId,
    name: client.name,
    displayNumber: client.displayNumber,
    email: client.email,
    phone: client.phone,
    whatsappNumber: client.whatsappNumber,
    whatsappSameAsPhone: client.whatsappSameAsPhone,
    company: client.company,
    notes: client.notes,
    deletedAt: client.deletedAt ? client.deletedAt.toISOString() : null,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

export function toDashboardClientSummaryDto(client: Client): DashboardClientSummaryDto {
  return {
    id: client.id,
    name: client.name,
    company: client.company,
    createdAt: client.createdAt.toISOString(),
  };
}
