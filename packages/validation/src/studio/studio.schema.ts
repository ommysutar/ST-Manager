import { z } from "zod";

/**
 * Runtime validation for creating a Studio. Field shape intentionally
 * mirrors the Studio type in packages/types; the API request/response DTOs
 * built on top of this schema will live in packages/contracts (M4).
 */
export const createStudioSchema = z.object({
  name: z.string().trim().min(1, "Studio name is required").max(120),
});

export type CreateStudioInput = z.infer<typeof createStudioSchema>;
