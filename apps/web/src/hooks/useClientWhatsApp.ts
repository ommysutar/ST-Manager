"use client";

import type { ClientResponseDto } from "@st-manager/contracts";

import { getClientWhatsAppNumber } from "@/lib/clients/whatsapp";
import { useClients } from "@/hooks/useClients";

/** Resolves a client's WhatsApp number from the in-memory snapshot. */
export function useClientWhatsAppNumber(clientId: string | undefined): string | null {
  const clients = useClients();

  if (!clientId) {
    return null;
  }

  const client = clients.find((entry) => entry.id === clientId);
  return client ? getClientWhatsAppNumber(client) : null;
}

export function resolveClientWhatsAppNumber(
  clientId: string | undefined,
  clients: ClientResponseDto[],
): string | null {
  if (!clientId) {
    return null;
  }

  const client = clients.find((entry) => entry.id === clientId);
  return client ? getClientWhatsAppNumber(client) : null;
}
