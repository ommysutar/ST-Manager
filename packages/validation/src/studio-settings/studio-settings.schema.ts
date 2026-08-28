import type { UpdateStudioSettingsDto } from "@st-manager/contracts";
import { z } from "zod";

export const updateStudioSettingsSchema = z
  .object({
    profile: z.unknown().optional(),
    whatsapp: z.unknown().optional(),
  })
  .refine((value) => value.profile !== undefined || value.whatsapp !== undefined, {
    message: "At least one field is required",
  });

export type UpdateStudioSettingsInput = z.infer<typeof updateStudioSettingsSchema>;

const _updateContractCheck: UpdateStudioSettingsDto = {} as UpdateStudioSettingsInput;
