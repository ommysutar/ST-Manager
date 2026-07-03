import { ROUTES } from "@st-manager/constants";
import type {
  CancelSessionResponseDto,
  CompleteSessionResponseDto,
  CreateSessionDto,
  CreateSessionResponseDto,
  GetSessionResponseDto,
  ListSessionsQueryDto,
  ListSessionsResponseDto,
  SessionResponseDto,
  StartSessionResponseDto,
  UpdateSessionDto,
  UpdateSessionResponseDto,
} from "@st-manager/contracts";
import { createSessionSchema, updateSessionSchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface SessionsApi {
  createSession(input: CreateSessionDto): Promise<SessionResponseDto>;
  listSessions(query?: ListSessionsQueryDto): Promise<ListSessionsResponseDto>;
  getSession(id: string): Promise<SessionResponseDto>;
  updateSession(id: string, input: UpdateSessionDto): Promise<SessionResponseDto>;
  startSession(id: string): Promise<SessionResponseDto>;
  completeSession(id: string): Promise<SessionResponseDto>;
  cancelSession(id: string): Promise<void>;
}

export function createSessionsApi(client: HttpClient): SessionsApi {
  return {
    createSession: async (input) => {
      const validated = createSessionSchema.parse(input);
      const response = await client.post<CreateSessionResponseDto>(ROUTES.SESSIONS, validated);
      return response.data;
    },

    listSessions: (query = {}) =>
      client.get<ListSessionsResponseDto>(ROUTES.SESSIONS, {
        studioId: query.studioId,
        status: query.status,
        bookingId: query.bookingId,
        from: query.from,
        to: query.to,
        page: query.page,
        pageSize: query.pageSize,
      }),

    getSession: async (id) => {
      const response = await client.get<GetSessionResponseDto>(`${ROUTES.SESSIONS}/${id}`);
      return response.data;
    },

    updateSession: async (id, input) => {
      const validated = updateSessionSchema.parse(input);
      const response = await client.patch<UpdateSessionResponseDto>(
        `${ROUTES.SESSIONS}/${id}`,
        validated,
      );
      return response.data;
    },

    startSession: async (id) => {
      const response = await client.post<StartSessionResponseDto>(
        `${ROUTES.SESSIONS}/${id}/start`,
        {},
      );
      return response.data;
    },

    completeSession: async (id) => {
      const response = await client.post<CompleteSessionResponseDto>(
        `${ROUTES.SESSIONS}/${id}/complete`,
        {},
      );
      return response.data;
    },

    cancelSession: async (id) => {
      await client.delete<CancelSessionResponseDto>(`${ROUTES.SESSIONS}/${id}`);
    },
  };
}
