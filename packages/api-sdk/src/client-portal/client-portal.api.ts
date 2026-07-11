import { ROUTES } from "@st-manager/constants";
import type {
  ClientPortalAccessResponseDto,
  ClientPortalCreateOrSyncRequestDto,
  ClientPortalCreateResponseDto,
  ClientPortalEmailRequestDto,
  ClientPortalLinkMetaDto,
  ClientPortalMetaResponseDto,
  ClientPortalSnapshotDto,
} from "@st-manager/contracts";
import {
  clientPortalCreateOrSyncSchema,
  clientPortalEmailSchema,
} from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface ClientPortalApi {
  getMeta(projectKey: string): Promise<ClientPortalLinkMetaDto>;
  create(projectKey: string, input: ClientPortalCreateOrSyncRequestDto): Promise<ClientPortalCreateResponseDto["data"]>;
  regenerate(projectKey: string, input: ClientPortalCreateOrSyncRequestDto): Promise<ClientPortalCreateResponseDto["data"]>;
  sync(projectKey: string, input: ClientPortalCreateOrSyncRequestDto): Promise<ClientPortalLinkMetaDto>;
  disable(projectKey: string): Promise<ClientPortalLinkMetaDto>;
  enable(projectKey: string): Promise<ClientPortalLinkMetaDto>;
  sendEmail(projectKey: string, input: ClientPortalEmailRequestDto): Promise<void>;
  access(token: string): Promise<ClientPortalAccessResponseDto["data"]>;
}

export function createClientPortalApi(client: HttpClient): ClientPortalApi {
  return {
    getMeta: async (projectKey) => {
      const response = await client.get<ClientPortalMetaResponseDto>(
        `${ROUTES.CLIENT_PORTAL}/projects/${encodeURIComponent(projectKey)}`,
      );
      return response.data;
    },

    create: async (projectKey, input) => {
      const validated = clientPortalCreateOrSyncSchema.parse(input);
      const response = await client.post<ClientPortalCreateResponseDto>(
        `${ROUTES.CLIENT_PORTAL}/projects/${encodeURIComponent(projectKey)}/create`,
        validated,
      );
      return response.data;
    },

    regenerate: async (projectKey, input) => {
      const validated = clientPortalCreateOrSyncSchema.parse(input);
      const response = await client.post<ClientPortalCreateResponseDto>(
        `${ROUTES.CLIENT_PORTAL}/projects/${encodeURIComponent(projectKey)}/regenerate`,
        validated,
      );
      return response.data;
    },

    sync: async (projectKey, input) => {
      const validated = clientPortalCreateOrSyncSchema.parse(input);
      const response = await client.post<ClientPortalMetaResponseDto>(
        `${ROUTES.CLIENT_PORTAL}/projects/${encodeURIComponent(projectKey)}/sync`,
        validated,
      );
      return response.data;
    },

    disable: async (projectKey) => {
      const response = await client.post<ClientPortalMetaResponseDto>(
        `${ROUTES.CLIENT_PORTAL}/projects/${encodeURIComponent(projectKey)}/disable`,
        {},
      );
      return response.data;
    },

    enable: async (projectKey) => {
      const response = await client.post<ClientPortalMetaResponseDto>(
        `${ROUTES.CLIENT_PORTAL}/projects/${encodeURIComponent(projectKey)}/enable`,
        {},
      );
      return response.data;
    },

    sendEmail: async (projectKey, input) => {
      const validated = clientPortalEmailSchema.parse(input);
      await client.post(`${ROUTES.CLIENT_PORTAL}/projects/${encodeURIComponent(projectKey)}/email`, validated);
    },

    access: async (token) => {
      const response = await client.get<ClientPortalAccessResponseDto>(
        `${ROUTES.CLIENT_PORTAL}/access/${encodeURIComponent(token)}?_=${Date.now()}`,
      );
      return response.data;
    },
  };
}

export type { ClientPortalSnapshotDto };
