import type { SyncProjectsPullQueryDto } from "@st-manager/contracts";
import { z } from "zod";

export const syncProjectsPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export type SyncProjectsPullQueryInput = z.infer<typeof syncProjectsPullQuerySchema>;

const _contractCheck: SyncProjectsPullQueryDto = {} as SyncProjectsPullQueryInput;
