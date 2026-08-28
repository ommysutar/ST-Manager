import type { CreateStudioServiceDto, UpdateStudioServiceDto } from "@st-manager/contracts";
import { z } from "zod";

const servicePricesSchema = z.object({
  basic: z.number().min(0),
  standard: z.number().min(0),
  premium: z.number().min(0),
});

export const createStudioServiceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  active: z.boolean().optional().default(true),
  mandatory: z.boolean().optional().default(false),
  isStudioRent: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).optional().default(0),
  legacyPrice: z.number().min(0).optional().default(0),
  prices: servicePricesSchema,
});

export type CreateStudioServiceInput = z.infer<typeof createStudioServiceSchema>;

export const updateStudioServiceSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().max(120).optional(),
    description: z.string().trim().max(2000).optional(),
    active: z.boolean().optional(),
    mandatory: z.boolean().optional(),
    isStudioRent: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
    legacyPrice: z.number().min(0).optional(),
    prices: servicePricesSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.category !== undefined ||
      value.description !== undefined ||
      value.active !== undefined ||
      value.mandatory !== undefined ||
      value.isStudioRent !== undefined ||
      value.sortOrder !== undefined ||
      value.legacyPrice !== undefined ||
      value.prices !== undefined,
    { message: "At least one field is required" },
  );

export type UpdateStudioServiceInput = z.infer<typeof updateStudioServiceSchema>;

const _createContractCheck: CreateStudioServiceDto = {} as CreateStudioServiceInput;
const _updateContractCheck: UpdateStudioServiceDto = {} as UpdateStudioServiceInput;
