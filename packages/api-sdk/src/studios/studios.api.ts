import { ROUTES } from "@st-manager/constants";
import type {
  CreateStudioDto,
  CreateStudioResponseDto,
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
 * Typed methods for the Studio resource, calling the real `POST`/`GET
 * /studios` endpoints implemented in `apps/api` (M5).
 *
 * `listStudios` returns `ListStudiosResponseDto` as-is (the `{ success,
 * data, meta }` envelope — `meta` is genuinely useful to SDK callers, not
 * just transport plumbing). `createStudio` unwraps the server's `{ success,
 * data }` envelope (`CreateStudioResponseDto`) down to a plain
 * `StudioResponseDto`, so the wire-level envelope never leaks past this SDK.
 */
export function createStudiosApi(client: HttpClient): StudiosApi {
  return {
    listStudios: (query = {}) =>
      client.get<ListStudiosResponseDto>(ROUTES.STUDIOS, {
        page: query.page,
        pageSize: query.pageSize,
      }),

    createStudio: async (input) => {
      // Fail fast client-side with the same rules the server enforces.
      // Never a trust boundary on its own — the server always re-validates.
      const validated = createStudioSchema.parse(input);
      const response = await client.post<CreateStudioResponseDto>(ROUTES.STUDIOS, validated);
      return response.data;
    },
  };
}
