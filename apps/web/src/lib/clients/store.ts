import type { ClientResponseDto } from "@st-manager/contracts";

import { clientsApi } from "@/lib/api-client";

import { filterProductionClients, isTestOrDemoClient } from "./smoke-clients";

let clientsSnapshot: ClientResponseDto[] = [];
let refreshPromise: Promise<ClientResponseDto[]> | null = null;

export function getClientsSnapshot(): ClientResponseDto[] {
  return clientsSnapshot;
}

export function setClientsSnapshot(next: ClientResponseDto[]): ClientResponseDto[] {
  clientsSnapshot = next;
  return clientsSnapshot;
}

async function purgeTestClientsFromApi(clients: ClientResponseDto[]): Promise<ClientResponseDto[]> {
  const testClients = clients.filter(isTestOrDemoClient);
  if (testClients.length === 0) {
    return clients;
  }

  await Promise.all(
    testClients.map(async (client) => {
      try {
        await clientsApi.deleteClient(client.id);
      } catch {
        // Ignore stale or already-deleted records.
      }
    }),
  );

  return clients.filter((client) => !isTestOrDemoClient(client));
}

export async function loadProductionClients(): Promise<ClientResponseDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: ClientResponseDto[] = [];

  while (page <= 20) {
    const response = await clientsApi.listClients({ page, pageSize });
    all.push(...response.data);
    if (response.data.length < pageSize) {
      break;
    }
    page += 1;
  }

  const productionClients = filterProductionClients(all);
  return purgeTestClientsFromApi(productionClients);
}

export async function refreshClientsSnapshot(): Promise<ClientResponseDto[]> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = loadProductionClients()
    .then((clients) => {
      setClientsSnapshot(clients);
      return clients;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function upsertClientInSnapshot(client: ClientResponseDto): void {
  if (isTestOrDemoClient(client)) {
    return;
  }

  const next = [client, ...clientsSnapshot.filter((entry) => entry.id !== client.id)].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
  setClientsSnapshot(next);
}

export function removeClientFromSnapshot(clientId: string): void {
  setClientsSnapshot(clientsSnapshot.filter((client) => client.id !== clientId));
}
