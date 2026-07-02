import { ROUTES } from "@st-manager/constants";
import type {
  CreateStudioDto,
  ListStudiosQueryDto,
  ListStudiosResponseDto,
  StudioResponseDto,
} from "@st-manager/contracts";
import { createStudioSchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface StudiosApi {
  listStudios(query?: ListStudiosQueryDto): Promise<ListStudiosResponseDto>;
  createStudio(input: CreateStudioDto): Promise<StudioResponseDto>;
}

/**
 * Typed methods for the Studio resource. The actual `POST`/`GET /studios`
 * endpoints don't exist until M5 — these calls will fail with a network
 * error until then, by design (see the M4 planning report).
 */
export function createStudiosApi(client: HttpClient): StudiosApi {
  return {
    listStudios: (query = {}) =>
      client.get<ListStudiosResponseDto>(ROUTES.STUDIOS, {
        page: query.page,
        pageSize: query.pageSize,
      }),

    createStudio: (input) => {
      // Fail fast client-side with the same rules the server (M5) will
      // enforce. Never a trust boundary on its own — the server always
      // re-validates.
      const validated = createStudioSchema.parse(input);
      return client.post<StudioResponseDto>(ROUTES.STUDIOS, validated);
    },
  };
}
