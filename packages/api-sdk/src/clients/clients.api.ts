import { ROUTES } from "@st-manager/constants";
import type {
  ClientResponseDto,
  CreateClientResponseDto,
  DeleteClientResponseDto,
  GetClientResponseDto,
  ListClientsQueryDto,
  ListClientsResponseDto,
  UpdateClientDto,
  UpdateClientResponseDto,
} from "@st-manager/contracts";
import type { CreateClientDto } from "@st-manager/contracts";
import { createClientSchema, serializeClientRequestBody, updateClientSchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface ClientsApi {
  createClient(input: CreateClientDto): Promise<ClientResponseDto>;
  listClients(query?: ListClientsQueryDto): Promise<ListClientsResponseDto>;
  getClient(id: string): Promise<ClientResponseDto>;
  updateClient(id: string, input: UpdateClientDto): Promise<ClientResponseDto>;
  deleteClient(id: string): Promise<void>;
}

export function createClientsApi(client: HttpClient): ClientsApi {
  return {
    createClient: async (input) => {
      const validated = createClientSchema.parse(input);
      const response = await client.post<CreateClientResponseDto>(
        ROUTES.CLIENTS,
        serializeClientRequestBody(validated),
      );
      return response.data;
    },

    listClients: (query = {}) =>
      client.get<ListClientsResponseDto>(ROUTES.CLIENTS, {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
      }),

    getClient: async (id) => {
      const response = await client.get<GetClientResponseDto>(`${ROUTES.CLIENTS}/${id}`);
      return response.data;
    },

    updateClient: async (id, input) => {
      const validated = updateClientSchema.parse(input);
      const response = await client.patch<UpdateClientResponseDto>(
        `${ROUTES.CLIENTS}/${id}`,
        serializeClientRequestBody(validated),
      );
      return response.data;
    },

    deleteClient: async (id) => {
      await client.delete<DeleteClientResponseDto>(`${ROUTES.CLIENTS}/${id}`);
    },
  };
}
