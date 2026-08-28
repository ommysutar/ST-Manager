import type { SyncStudioRoomsPullQueryDto } from "@st-manager/contracts";
import { z } from "zod";

export const syncStudioRoomsPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export type SyncStudioRoomsPullQueryInput = z.infer<typeof syncStudioRoomsPullQuerySchema>;

const _contractCheck: SyncStudioRoomsPullQueryDto = {} as SyncStudioRoomsPullQueryInput;
