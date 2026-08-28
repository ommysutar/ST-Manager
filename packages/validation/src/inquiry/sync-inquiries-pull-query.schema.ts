import type { SyncInquiriesPullQueryDto } from "@st-manager/contracts";
import { z } from "zod";

export const syncInquiriesPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export type SyncInquiriesPullQueryInput = z.infer<typeof syncInquiriesPullQuerySchema>;

const _contractCheck: SyncInquiriesPullQueryDto = {} as SyncInquiriesPullQueryInput;
