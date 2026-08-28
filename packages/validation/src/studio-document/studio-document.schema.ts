import type { CreateStudioDocumentDto, UpdateStudioDocumentDto } from "@st-manager/contracts";
import { z } from "zod";

const studioDocumentTypeSchema = z.enum(["quotation", "invoice", "receipt"]);

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

export const createStudioDocumentSchema = z.object({
  type: studioDocumentTypeSchema,
  inquiryId: optionalNullableString(64),
  projectId: optionalNullableString(64),
  paymentId: optionalNullableString(64),
  snapshot: z.unknown().optional(),
});

export type CreateStudioDocumentInput = z.infer<typeof createStudioDocumentSchema>;

export const updateStudioDocumentSchema = z
  .object({
    inquiryId: optionalUpdateNullableString(64),
    projectId: optionalUpdateNullableString(64),
    paymentId: optionalUpdateNullableString(64),
    snapshot: z.unknown().nullable().optional(),
  })
  .refine(
    (value) =>
      value.inquiryId !== undefined ||
      value.projectId !== undefined ||
      value.paymentId !== undefined ||
      value.snapshot !== undefined,
    { message: "At least one field is required" },
  );

export type UpdateStudioDocumentInput = z.infer<typeof updateStudioDocumentSchema>;

const _createContractCheck: CreateStudioDocumentDto = {} as CreateStudioDocumentInput;
const _updateContractCheck: UpdateStudioDocumentDto = {} as UpdateStudioDocumentInput;
