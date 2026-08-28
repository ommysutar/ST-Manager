import type { SyncStudioDocumentsPullQueryDto } from "@st-manager/contracts";
import { z } from "zod";

export const syncStudioDocumentsPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export type SyncStudioDocumentsPullQueryInput = z.infer<
  typeof syncStudioDocumentsPullQuerySchema
>;

const _contractCheck: SyncStudioDocumentsPullQueryDto = {} as SyncStudioDocumentsPullQueryInput;
