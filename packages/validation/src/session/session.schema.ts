import type { CreateSessionDto, UpdateSessionDto } from "@st-manager/contracts";
import { PAGINATION } from "@st-manager/constants";
import { z } from "zod";

const isoDateTime = z.string().datetime({ message: "Invalid ISO datetime" });

const sessionStatus = z.enum(["scheduled", "in_progress", "completed", "cancelled"]);

function optionalNullableNotes() {
  return z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((value) => (value === undefined || value === "" ? null : value));
}

function optionalUpdateNotes() {
  return z
    .union([z.string().trim().max(2000), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .optional();
}

function optionalClientId() {
  return z
    .string()
    .trim()
    .min(1)
    .nullish()
    .transform((value) => (value === undefined || value === "" ? null : value));
}

function optionalUpdateClientId() {
  return z
    .union([z.string().trim().min(1), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .optional();
}

function optionalBookingId() {
  return z
    .string()
    .trim()
    .min(1)
    .nullish()
    .transform((value) => (value === undefined || value === "" ? null : value));
}

export const createSessionSchema = z.object({
  studioId: z.string().trim().min(1).optional(),
  clientId: optionalClientId(),
  bookingId: optionalBookingId(),
  title: z.string().trim().min(1).max(120).optional(),
  startedAt: isoDateTime.optional(),
  notes: optionalNullableNotes(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = z
  .object({
    studioId: z.string().trim().min(1).optional(),
    clientId: optionalUpdateClientId(),
    title: z.string().trim().min(1).max(120).optional(),
    startedAt: isoDateTime.optional(),
    notes: optionalUpdateNotes(),
  })
  .refine(
    (value) =>
      value.studioId !== undefined ||
      value.clientId !== undefined ||
      value.title !== undefined ||
      value.startedAt !== undefined ||
      value.notes !== undefined,
    { message: "At least one field is required" },
  );

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

export const listSessionsQuerySchema = z.object({
  studioId: z.string().trim().min(1).optional(),
  status: sessionStatus.optional(),
  bookingId: z.string().trim().min(1).optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.MAX_PAGE_SIZE)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
});

export type ListSessionsQueryInput = z.infer<typeof listSessionsQuerySchema>;

const _createContractCheck: CreateSessionDto = {} as CreateSessionInput;
const _updateContractCheck: UpdateSessionDto = {} as UpdateSessionInput;
