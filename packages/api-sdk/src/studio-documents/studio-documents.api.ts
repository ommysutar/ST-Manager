import { ROUTES } from "@st-manager/constants";
import type {
  CreateStudioDocumentDto,
  CreateStudioDocumentResponseDto,
  DeleteStudioDocumentResponseDto,
  GetStudioDocumentResponseDto,
  ListStudioDocumentsQueryDto,
  ListStudioDocumentsResponseDto,
  StudioDocumentResponseDto,
  SyncStudioDocumentsPullQueryDto,
  SyncStudioDocumentsPullResponseDto,
  UpdateStudioDocumentDto,
  UpdateStudioDocumentResponseDto,
} from "@st-manager/contracts";
import {
  createStudioDocumentSchema,
  updateStudioDocumentSchema,
} from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface StudioDocumentsApi {
  createStudioDocument(input: CreateStudioDocumentDto): Promise<StudioDocumentResponseDto>;
  listStudioDocuments(
    query?: ListStudioDocumentsQueryDto,
  ): Promise<ListStudioDocumentsResponseDto>;
  pullStudioDocumentChanges(
    query?: SyncStudioDocumentsPullQueryDto,
  ): Promise<SyncStudioDocumentsPullResponseDto["data"]>;
  getStudioDocument(id: string): Promise<StudioDocumentResponseDto>;
  updateStudioDocument(
    id: string,
    input: UpdateStudioDocumentDto,
  ): Promise<StudioDocumentResponseDto>;
  deleteStudioDocument(id: string): Promise<void>;
}

export function createStudioDocumentsApi(client: HttpClient): StudioDocumentsApi {
  return {
    createStudioDocument: async (input) => {
      const validated = createStudioDocumentSchema.parse(input);
      const response = await client.post<CreateStudioDocumentResponseDto>(
        ROUTES.STUDIO_DOCUMENTS,
        validated,
      );
      return response.data;
    },

    listStudioDocuments: (query = {}) =>
      client.get<ListStudioDocumentsResponseDto>(ROUTES.STUDIO_DOCUMENTS, {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
      }),

    pullStudioDocumentChanges: async (query = {}) => {
      const response = await client.get<SyncStudioDocumentsPullResponseDto>(
        `${ROUTES.STUDIO_DOCUMENTS}/changes`,
        { since: query.since },
      );
      return response.data;
    },

    getStudioDocument: async (id) => {
      const response = await client.get<GetStudioDocumentResponseDto>(
        `${ROUTES.STUDIO_DOCUMENTS}/${id}`,
      );
      return response.data;
    },

    updateStudioDocument: async (id, input) => {
      const validated = updateStudioDocumentSchema.parse(input);
      const response = await client.patch<UpdateStudioDocumentResponseDto>(
        `${ROUTES.STUDIO_DOCUMENTS}/${id}`,
        validated,
      );
      return response.data;
    },

    deleteStudioDocument: async (id) => {
      await client.delete<DeleteStudioDocumentResponseDto>(
        `${ROUTES.STUDIO_DOCUMENTS}/${id}`,
      );
    },
  };
}
