import type { CreateClientDto, UpdateClientDto } from "@st-manager/contracts";
import { z } from "zod";

function optionalNullableString(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value));
}

function optionalEmail() {
  return z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value))
    .refine((value) => value === null || z.string().email().safeParse(value).success, {
      message: "Invalid email address",
    });
}

function optionalUpdateEmail() {
  return z
    .union([z.string().trim().email().max(255), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .optional();
}

function optionalUpdateNullableString(max: number) {
  return z
    .union([z.string().trim().max(max), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .optional();
}

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required").max(120),
  email: optionalEmail(),
  phone: optionalNullableString(64),
  company: optionalNullableString(120),
  notes: optionalNullableString(2000),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z
  .object({
    name: z.string().trim().min(1, "Client name is required").max(120).optional(),
    email: optionalUpdateEmail(),
    phone: optionalUpdateNullableString(64),
    company: optionalUpdateNullableString(120),
    notes: optionalUpdateNullableString(2000),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.phone !== undefined ||
      value.company !== undefined ||
      value.notes !== undefined,
    { message: "At least one field is required" },
  );

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

const _createContractCheck: CreateClientDto = {} as CreateClientInput;
const _updateContractCheck: UpdateClientDto = {} as UpdateClientInput;
