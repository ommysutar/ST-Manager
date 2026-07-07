import type { ClientResponseDto } from "@st-manager/contracts";

import { clientsApi } from "@/lib/api-client";
import { notifyClientsUpdated } from "@/lib/clients/events";
import { removeClientFromSnapshot } from "@/lib/clients/store";

import { getClientLinkedRecords, removeClientLinkedLocalData } from "./linked-records";
import { isTestOrDemoClient } from "./smoke-clients";

export interface DeleteClientResult {
  clientId: string;
  removedLinkedRecords: boolean;
}

export function clientHasLinkedRecords(clientId: string, client?: ClientResponseDto): boolean {
  return getClientLinkedRecords(clientId, client).hasLinkedRecords;
}

export async function deleteClientWithLinkedData(
  client: ClientResponseDto,
): Promise<DeleteClientResult> {
  const linkedRecords = getClientLinkedRecords(client.id, client);

  await clientsApi.deleteClient(client.id);

  if (linkedRecords.hasLinkedRecords) {
    removeClientLinkedLocalData(client.id, client);
  }

  removeClientFromSnapshot(client.id);
  notifyClientsUpdated();

  return {
    clientId: client.id,
    removedLinkedRecords: linkedRecords.hasLinkedRecords,
  };
}

/** Deletes test/demo clients left over from CI or E2E runs. */
export async function purgeTestClients(clients: ClientResponseDto[]): Promise<ClientResponseDto[]> {
  const testClients = clients.filter(isTestOrDemoClient);
  if (testClients.length === 0) {
    return clients;
  }

  await Promise.all(
    testClients.map(async (client) => {
      try {
        await deleteClientWithLinkedData(client);
      } catch {
        // Ignore stale or already-deleted records.
      }
    }),
  );

  return clients.filter((client) => !isTestOrDemoClient(client));
}
