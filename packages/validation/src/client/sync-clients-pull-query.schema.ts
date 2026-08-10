import type { SyncClientsPullQueryDto } from "@st-manager/contracts";
import { z } from "zod";

export const syncClientsPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export type SyncClientsPullQueryInput = z.infer<typeof syncClientsPullQuerySchema>;

const _contractCheck: SyncClientsPullQueryDto = {} as SyncClientsPullQueryInput;
