import type { ListClientsQueryDto } from "@st-manager/contracts";
import { PAGINATION } from "@st-manager/constants";
import { z } from "zod";

export const listClientsQuerySchema = z.object({
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

export type ListClientsQueryInput = z.infer<typeof listClientsQuerySchema>;

const _contractCheck: ListClientsQueryDto = {} as ListClientsQueryInput;
