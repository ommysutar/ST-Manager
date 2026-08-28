import type { ListStudioDocumentsQueryDto } from "@st-manager/contracts";
import { PAGINATION } from "@st-manager/constants";
import { z } from "zod";

export const listStudioDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_PAGE_SIZE)
    .optional()
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(120).optional(),
});

export type ListStudioDocumentsQueryInput = z.infer<typeof listStudioDocumentsQuerySchema>;

const _contractCheck: ListStudioDocumentsQueryDto = {} as ListStudioDocumentsQueryInput;
