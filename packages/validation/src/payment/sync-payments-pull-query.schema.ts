import type { SyncPaymentsPullQueryDto } from "@st-manager/contracts";
import { z } from "zod";

export const syncPaymentsPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export type SyncPaymentsPullQueryInput = z.infer<typeof syncPaymentsPullQuerySchema>;

const _contractCheck: SyncPaymentsPullQueryDto = {} as SyncPaymentsPullQueryInput;
