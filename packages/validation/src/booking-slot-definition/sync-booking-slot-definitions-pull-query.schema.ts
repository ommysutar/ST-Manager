import type { SyncBookingSlotDefinitionsPullQueryDto } from "@st-manager/contracts";
import { z } from "zod";

export const syncBookingSlotDefinitionsPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export type SyncBookingSlotDefinitionsPullQueryInput = z.infer<
  typeof syncBookingSlotDefinitionsPullQuerySchema
>;

const _contractCheck: SyncBookingSlotDefinitionsPullQueryDto =
  {} as SyncBookingSlotDefinitionsPullQueryInput;
