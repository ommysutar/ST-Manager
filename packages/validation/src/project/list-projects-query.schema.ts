import type { ListProjectsQueryDto } from "@st-manager/contracts";
import { PAGINATION } from "@st-manager/constants";
import { z } from "zod";

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.MAX_PAGE_SIZE)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
  search: z
    .string()
    .trim()
    .min(1)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export type ListProjectsQueryInput = z.infer<typeof listProjectsQuerySchema>;

const _contractCheck: ListProjectsQueryDto = {} as ListProjectsQueryInput;
