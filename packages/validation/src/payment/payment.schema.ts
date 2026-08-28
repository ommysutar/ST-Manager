import type { CreatePaymentDto, UpdatePaymentDto } from "@st-manager/contracts";
import { z } from "zod";

const paymentMethodSchema = z.enum(["cash", "upi"]);
const paymentSourceSchema = z.enum(["advance", "manual"]);
const paymentStatusSchema = z.enum(["received"]);

export const createPaymentSchema = z.object({
  projectId: z.string().trim().min(1).max(64),
  amount: z.number().min(0),
  method: paymentMethodSchema,
  notes: z.string().trim().max(2000).optional().default(""),
  receivedBy: z.string().trim().max(120).optional().default(""),
  source: paymentSourceSchema.optional().default("manual"),
  status: paymentStatusSchema.optional().default("received"),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = z
  .object({
    projectId: z.string().trim().min(1).max(64).optional(),
    amount: z.number().min(0).optional(),
    method: paymentMethodSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
    receivedBy: z.string().trim().max(120).optional(),
    source: paymentSourceSchema.optional(),
    status: paymentStatusSchema.optional(),
  })
  .refine(
    (value) =>
      value.projectId !== undefined ||
      value.amount !== undefined ||
      value.method !== undefined ||
      value.notes !== undefined ||
      value.receivedBy !== undefined ||
      value.source !== undefined ||
      value.status !== undefined,
    { message: "At least one field is required" },
  );

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

const _createContractCheck: CreatePaymentDto = {} as CreatePaymentInput;
const _updateContractCheck: UpdatePaymentDto = {} as UpdatePaymentInput;
