import type { SyncStudiosPullQueryDto } from "@st-manager/contracts";
import { z } from "zod";

const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid ISO datetime",
});

export const syncStudiosPullQuerySchema = z.object({
  since: isoDateTimeSchema.optional(),
});

export type SyncStudiosPullQueryInput = z.infer<typeof syncStudiosPullQuerySchema>;

const _contractCheck: SyncStudiosPullQueryDto = {} as SyncStudiosPullQueryInput;
