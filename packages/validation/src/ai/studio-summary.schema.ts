import type { GenerateStudioSummaryRequestDto } from "@st-manager/contracts";
import { z } from "zod";

export const generateStudioSummarySchema = z.object({
  studioId: z.string().trim().min(1, "Studio id is required"),
  name: z.string().trim().min(1, "Studio name is required").max(120),
});

export type GenerateStudioSummaryInput = z.infer<typeof generateStudioSummarySchema>;

const _contractCheck: GenerateStudioSummaryRequestDto = {} as GenerateStudioSummaryInput;
