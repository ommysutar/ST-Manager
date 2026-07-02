import type { CreateStudioDto } from "@st-manager/contracts";
import { z } from "zod";

/**
 * Runtime validation for creating a Studio. Field shape intentionally
 * mirrors `CreateStudioDto` (packages/contracts, M4) — the contract is the
 * source of truth for the shape; this schema is checked against it below,
 * not the other way around.
 */
export const createStudioSchema = z.object({
  name: z.string().trim().min(1, "Studio name is required").max(120),
});

export type CreateStudioInput = z.infer<typeof createStudioSchema>;

// Compile-time check: the schema's output stays structurally compatible
// with the CreateStudioDto contract it implements.
const _contractCheck: CreateStudioDto = {} as CreateStudioInput;
