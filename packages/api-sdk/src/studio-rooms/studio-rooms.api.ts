import { ROUTES } from "@st-manager/constants";
import type {
  CreateStudioRoomDto,
  CreateStudioRoomResponseDto,
  DeleteStudioRoomResponseDto,
  GetStudioRoomResponseDto,
  ListStudioRoomsQueryDto,
  ListStudioRoomsResponseDto,
  StudioRoomResponseDto,
  SyncStudioRoomsPullQueryDto,
  SyncStudioRoomsPullResponseDto,
  UpdateStudioRoomDto,
  UpdateStudioRoomResponseDto,
} from "@st-manager/contracts";
import {
  createStudioRoomSchema,
  serializeStudioRoomRequestBody,
  updateStudioRoomSchema,
} from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface StudioRoomsApi {
  createStudioRoom(input: CreateStudioRoomDto): Promise<StudioRoomResponseDto>;
  listStudioRooms(query?: ListStudioRoomsQueryDto): Promise<ListStudioRoomsResponseDto>;
  pullStudioRoomChanges(
    query?: SyncStudioRoomsPullQueryDto,
  ): Promise<SyncStudioRoomsPullResponseDto["data"]>;
  getStudioRoom(id: string): Promise<StudioRoomResponseDto>;
  updateStudioRoom(id: string, input: UpdateStudioRoomDto): Promise<StudioRoomResponseDto>;
  deleteStudioRoom(id: string): Promise<void>;
}

export function createStudioRoomsApi(client: HttpClient): StudioRoomsApi {
  return {
    createStudioRoom: async (input) => {
      const validated = createStudioRoomSchema.parse(input);
      const response = await client.post<CreateStudioRoomResponseDto>(
        ROUTES.STUDIO_ROOMS,
        serializeStudioRoomRequestBody(validated),
      );
      return response.data;
    },

    listStudioRooms: (query = {}) =>
      client.get<ListStudioRoomsResponseDto>(ROUTES.STUDIO_ROOMS, {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
      }),

    pullStudioRoomChanges: async (query = {}) => {
      const response = await client.get<SyncStudioRoomsPullResponseDto>(
        `${ROUTES.STUDIO_ROOMS}/changes`,
        { since: query.since },
      );
      return response.data;
    },

    getStudioRoom: async (id) => {
      const response = await client.get<GetStudioRoomResponseDto>(`${ROUTES.STUDIO_ROOMS}/${id}`);
      return response.data;
    },

    updateStudioRoom: async (id, input) => {
      const validated = updateStudioRoomSchema.parse(input);
      const response = await client.patch<UpdateStudioRoomResponseDto>(
        `${ROUTES.STUDIO_ROOMS}/${id}`,
        serializeStudioRoomRequestBody(validated),
      );
      return response.data;
    },

    deleteStudioRoom: async (id) => {
      await client.delete<DeleteStudioRoomResponseDto>(`${ROUTES.STUDIO_ROOMS}/${id}`);
    },
  };
}
