import { ROUTES } from "@st-manager/constants";
import type {
  CreateProjectBookingDto,
  CreateProjectBookingResponseDto,
  DeleteProjectBookingResponseDto,
  GetProjectBookingResponseDto,
  ListProjectBookingsQueryDto,
  ListProjectBookingsResponseDto,
  ProjectBookingResponseDto,
  SyncProjectBookingsPullQueryDto,
  SyncProjectBookingsPullResponseDto,
  UpdateProjectBookingDto,
  UpdateProjectBookingResponseDto,
} from "@st-manager/contracts";
import {
  createProjectBookingSchema,
  serializeProjectBookingRequestBody,
  updateProjectBookingSchema,
} from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface ProjectBookingsApi {
  createProjectBooking(input: CreateProjectBookingDto): Promise<ProjectBookingResponseDto>;
  listProjectBookings(
    query?: ListProjectBookingsQueryDto,
  ): Promise<ListProjectBookingsResponseDto>;
  pullProjectBookingChanges(
    query?: SyncProjectBookingsPullQueryDto,
  ): Promise<SyncProjectBookingsPullResponseDto["data"]>;
  getProjectBooking(id: string): Promise<ProjectBookingResponseDto>;
  updateProjectBooking(
    id: string,
    input: UpdateProjectBookingDto,
  ): Promise<ProjectBookingResponseDto>;
  deleteProjectBooking(id: string): Promise<void>;
}

export function createProjectBookingsApi(client: HttpClient): ProjectBookingsApi {
  return {
    createProjectBooking: async (input) => {
      const validated = createProjectBookingSchema.parse(input);
      const response = await client.post<CreateProjectBookingResponseDto>(
        ROUTES.PROJECT_BOOKINGS,
        serializeProjectBookingRequestBody(validated),
      );
      return response.data;
    },

    listProjectBookings: (query = {}) =>
      client.get<ListProjectBookingsResponseDto>(ROUTES.PROJECT_BOOKINGS, {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
      }),

    pullProjectBookingChanges: async (query = {}) => {
      const response = await client.get<SyncProjectBookingsPullResponseDto>(
        `${ROUTES.PROJECT_BOOKINGS}/changes`,
        { since: query.since },
      );
      return response.data;
    },

    getProjectBooking: async (id) => {
      const response = await client.get<GetProjectBookingResponseDto>(
        `${ROUTES.PROJECT_BOOKINGS}/${id}`,
      );
      return response.data;
    },

    updateProjectBooking: async (id, input) => {
      const validated = updateProjectBookingSchema.parse(input);
      const response = await client.patch<UpdateProjectBookingResponseDto>(
        `${ROUTES.PROJECT_BOOKINGS}/${id}`,
        serializeProjectBookingRequestBody(validated),
      );
      return response.data;
    },

    deleteProjectBooking: async (id) => {
      await client.delete<DeleteProjectBookingResponseDto>(`${ROUTES.PROJECT_BOOKINGS}/${id}`);
    },
  };
}
