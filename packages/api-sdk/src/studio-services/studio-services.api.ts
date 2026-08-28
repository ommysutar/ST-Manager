import { ROUTES } from "@st-manager/constants";
import type {
  CreateStudioServiceDto,
  CreateStudioServiceResponseDto,
  DeleteStudioServiceResponseDto,
  GetStudioServiceResponseDto,
  ListStudioServicesQueryDto,
  ListStudioServicesResponseDto,
  StudioServiceResponseDto,
  SyncStudioServicesPullQueryDto,
  SyncStudioServicesPullResponseDto,
  UpdateStudioServiceDto,
  UpdateStudioServiceResponseDto,
} from "@st-manager/contracts";
import {
  createStudioServiceSchema,
  serializeStudioServiceRequestBody,
  updateStudioServiceSchema,
} from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface StudioServicesApi {
  createStudioService(input: CreateStudioServiceDto): Promise<StudioServiceResponseDto>;
  listStudioServices(query?: ListStudioServicesQueryDto): Promise<ListStudioServicesResponseDto>;
  pullStudioServiceChanges(
    query?: SyncStudioServicesPullQueryDto,
  ): Promise<SyncStudioServicesPullResponseDto["data"]>;
  getStudioService(id: string): Promise<StudioServiceResponseDto>;
  updateStudioService(
    id: string,
    input: UpdateStudioServiceDto,
  ): Promise<StudioServiceResponseDto>;
  deleteStudioService(id: string): Promise<void>;
}

export function createStudioServicesApi(client: HttpClient): StudioServicesApi {
  return {
    createStudioService: async (input) => {
      const validated = createStudioServiceSchema.parse(input);
      const response = await client.post<CreateStudioServiceResponseDto>(
        ROUTES.STUDIO_SERVICES,
        serializeStudioServiceRequestBody(validated),
      );
      return response.data;
    },

    listStudioServices: (query = {}) =>
      client.get<ListStudioServicesResponseDto>(ROUTES.STUDIO_SERVICES, {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
      }),

    pullStudioServiceChanges: async (query = {}) => {
      const response = await client.get<SyncStudioServicesPullResponseDto>(
        `${ROUTES.STUDIO_SERVICES}/changes`,
        { since: query.since },
      );
      return response.data;
    },

    getStudioService: async (id) => {
      const response = await client.get<GetStudioServiceResponseDto>(
        `${ROUTES.STUDIO_SERVICES}/${id}`,
      );
      return response.data;
    },

    updateStudioService: async (id, input) => {
      const validated = updateStudioServiceSchema.parse(input);
      const response = await client.patch<UpdateStudioServiceResponseDto>(
        `${ROUTES.STUDIO_SERVICES}/${id}`,
        serializeStudioServiceRequestBody(validated),
      );
      return response.data;
    },

    deleteStudioService: async (id) => {
      await client.delete<DeleteStudioServiceResponseDto>(`${ROUTES.STUDIO_SERVICES}/${id}`);
    },
  };
}
