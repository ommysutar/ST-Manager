import type { CreateInquiryDto, UpdateInquiryDto } from "@st-manager/contracts";
import { z } from "zod";

function preprocessOptionalString(value: unknown): unknown {
  if (value === null || value === undefined) {
    return "";
  }

  return value;
}

function optionalNullableString(max: number) {
  return z.preprocess(
    preprocessOptionalString,
    z
      .string()
      .trim()
      .max(max)
      .optional()
      .transform((value) => (value === undefined || value === "" ? null : value)),
  );
}

function optionalUpdateNullableString(max: number) {
  return z
    .union([z.string().trim().max(max), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value))
    .optional();
}

export const createInquirySchema = z.object({
  status: z.string().trim().max(32).optional().default("inquiry"),
  projectId: optionalNullableString(64),
  advanceAmount: z.number().nullable().optional(),
  remainingBalance: z.number().nullable().optional(),
  form: z.unknown(),
  quotation: z.unknown(),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;

export const updateInquirySchema = z
  .object({
    status: z.string().trim().max(32).optional(),
    projectId: optionalUpdateNullableString(64),
    advanceAmount: z.number().nullable().optional(),
    remainingBalance: z.number().nullable().optional(),
    form: z.unknown().optional(),
    quotation: z.unknown().optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.projectId !== undefined ||
      value.advanceAmount !== undefined ||
      value.remainingBalance !== undefined ||
      value.form !== undefined ||
      value.quotation !== undefined,
    { message: "At least one field is required" },
  );

export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;

const _createContractCheck: CreateInquiryDto = {} as CreateInquiryInput;
const _updateContractCheck: UpdateInquiryDto = {} as UpdateInquiryInput;
