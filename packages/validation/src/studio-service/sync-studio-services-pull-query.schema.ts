import type { SyncStudioServicesPullQueryDto } from "@st-manager/contracts";
import { z } from "zod";

export const syncStudioServicesPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export type SyncStudioServicesPullQueryInput = z.infer<typeof syncStudioServicesPullQuerySchema>;

const _contractCheck: SyncStudioServicesPullQueryDto = {} as SyncStudioServicesPullQueryInput;
