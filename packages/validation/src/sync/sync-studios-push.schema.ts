import { SYNC } from "@st-manager/constants";
import type { SyncStudiosPushRequestDto } from "@st-manager/contracts";
import { z } from "zod";

const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid ISO datetime",
});

const syncStudioItemSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1, "Studio name is required").max(120),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const syncStudiosPushSchema = z.object({
  studios: z.array(syncStudioItemSchema).min(1).max(SYNC.MAX_PUSH_BATCH),
});

export type SyncStudiosPushInput = z.infer<typeof syncStudiosPushSchema>;

const _contractCheck: SyncStudiosPushRequestDto = {} as SyncStudiosPushInput;
