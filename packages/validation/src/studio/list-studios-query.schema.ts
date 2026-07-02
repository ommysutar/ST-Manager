import type { ListStudiosQueryDto } from "@st-manager/contracts";
import { PAGINATION } from "@st-manager/constants";
import { z } from "zod";

/**
 * Runtime validation for `GET /studios` query parameters. Query strings
 * arrive as strings (e.g. `?page=2`), hence `z.coerce.number()` rather than
 * `z.number()` — the same coercion pattern `apiEnvSchema` (M3) uses for
 * `API_PORT`.
 */
export const listStudiosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.MAX_PAGE_SIZE)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
});

export type ListStudiosQueryInput = z.infer<typeof listStudiosQuerySchema>;

// Compile-time check: the schema's output stays structurally compatible
// with the ListStudiosQueryDto contract it implements.
const _contractCheck: ListStudiosQueryDto = {} as ListStudiosQueryInput;
