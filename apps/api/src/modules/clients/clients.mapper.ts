import type { DashboardClientSummaryDto } from "@st-manager/contracts";
import type { ClientResponseDto } from "@st-manager/contracts";
import type { Client } from "@st-manager/types";

export function toClientResponseDto(client: Client): ClientResponseDto {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company,
    notes: client.notes,
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
