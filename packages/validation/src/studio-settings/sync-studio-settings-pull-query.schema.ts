import type { SyncStudioSettingsPullQueryDto } from "@st-manager/contracts";
import { z } from "zod";

export const syncStudioSettingsPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export type SyncStudioSettingsPullQueryInput = z.infer<typeof syncStudioSettingsPullQuerySchema>;

const _contractCheck: SyncStudioSettingsPullQueryDto = {} as SyncStudioSettingsPullQueryInput;
