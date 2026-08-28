import type { SyncProjectBookingsPullQueryDto } from "@st-manager/contracts";
import { z } from "zod";

export const syncProjectBookingsPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export type SyncProjectBookingsPullQueryInput = z.infer<typeof syncProjectBookingsPullQuerySchema>;

const _contractCheck: SyncProjectBookingsPullQueryDto = {} as SyncProjectBookingsPullQueryInput;
