import type { CreateBookingDto, UpdateBookingDto } from "@st-manager/contracts";
import { z } from "zod";

const isoDateTime = z.string().datetime({ message: "Invalid ISO datetime" });

function optionalNullableNotes() {
  return z
    .string()
    .trim()
    .max(2000)
    .optional()
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
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value));
}

function optionalUpdateClientId() {
  return z
    .union([z.string().trim().min(1), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .optional();
}

function validateInterval(startAt: string, endAt: string): boolean {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return false;
  }

  return end - start >= 15 * 60 * 1000;
}

export const createBookingSchema = z
  .object({
    studioId: z.string().trim().min(1, "Studio is required"),
    clientId: optionalClientId(),
    title: z.string().trim().min(1, "Title is required").max(120),
    startAt: isoDateTime,
    endAt: isoDateTime,
    notes: optionalNullableNotes(),
  })
  .refine((value) => validateInterval(value.startAt, value.endAt), {
    message: "End time must be at least 15 minutes after start time",
    path: ["endAt"],
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingSchema = z
  .object({
    studioId: z.string().trim().min(1).optional(),
    clientId: optionalUpdateClientId(),
    title: z.string().trim().min(1).max(120).optional(),
    startAt: isoDateTime.optional(),
    endAt: isoDateTime.optional(),
    notes: optionalUpdateNotes(),
  })
  .refine(
    (value) =>
      value.studioId !== undefined ||
      value.clientId !== undefined ||
      value.title !== undefined ||
      value.startAt !== undefined ||
      value.endAt !== undefined ||
      value.notes !== undefined,
    { message: "At least one field is required" },
  )
  .refine(
    (value) => {
      if (value.startAt === undefined || value.endAt === undefined) {
        return true;
      }

      return validateInterval(value.startAt, value.endAt);
    },
    {
      message: "End time must be at least 15 minutes after start time",
      path: ["endAt"],
    },
  );

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

export const listBookingsQuerySchema = z
  .object({
    studioId: z.string().trim().min(1, "Studio is required"),
    from: isoDateTime,
    to: isoDateTime,
  })
  .refine((value) => Date.parse(value.to) > Date.parse(value.from), {
    message: "Range end must be after range start",
    path: ["to"],
  });

export type ListBookingsQueryInput = z.infer<typeof listBookingsQuerySchema>;

const _createContractCheck: CreateBookingDto = {} as CreateBookingInput;
const _updateContractCheck: UpdateBookingDto = {} as UpdateBookingInput;
