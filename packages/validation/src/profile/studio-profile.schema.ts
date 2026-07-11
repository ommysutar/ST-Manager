import { z } from "zod";

export const updateStudioUserProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required").max(120).optional(),
    phone: z.string().trim().max(64).optional().nullable(),
    studioName: z.string().trim().min(1, "Studio name is required").max(120).optional(),
  })
  .refine((value) => value.fullName !== undefined || value.phone !== undefined || value.studioName !== undefined, {
    message: "Provide at least one profile field to update",
  });

export type UpdateStudioUserProfileInput = z.infer<typeof updateStudioUserProfileSchema>;
