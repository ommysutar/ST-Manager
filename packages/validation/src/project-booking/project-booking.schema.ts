import type { CreateProjectBookingDto, UpdateProjectBookingDto } from "@st-manager/contracts";
import { z } from "zod";

const bookingStatusSchema = z.enum(["draft", "booked", "completed", "cancelled"]);

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

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

const payloadFields = {
  engineerId: optionalNullableString(64),
  sessionId: optionalNullableString(64),
  attendanceRecorded: z.boolean().optional(),
  equipmentIds: z.array(z.string()).optional().default([]),
};

export const createProjectBookingSchema = z.object({
  projectId: z.string().trim().min(1).max(64),
  roomStudioId: z.string().trim().min(1).max(64),
  clientId: optionalNullableString(64),
  bookingFor: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional().default(""),
  date: dateSchema,
  slotId: z.string().trim().min(1).max(64),
  status: bookingStatusSchema.optional().default("booked"),
  clientName: z.string().trim().min(1).max(120),
  projectName: z.string().trim().min(1).max(120),
  projectNumber: z.string().trim().max(32).optional().default(""),
  ...payloadFields,
});

export type CreateProjectBookingInput = z.infer<typeof createProjectBookingSchema>;

export const updateProjectBookingSchema = z
  .object({
    projectId: z.string().trim().min(1).max(64).optional(),
    roomStudioId: z.string().trim().min(1).max(64).optional(),
    clientId: optionalUpdateNullableString(64),
    bookingFor: z.string().trim().min(1).max(120).optional(),
    notes: z.string().trim().max(2000).optional(),
    date: dateSchema.optional(),
    slotId: z.string().trim().min(1).max(64).optional(),
    status: bookingStatusSchema.optional(),
    clientName: z.string().trim().min(1).max(120).optional(),
    projectName: z.string().trim().min(1).max(120).optional(),
    projectNumber: z.string().trim().max(32).optional(),
    engineerId: optionalUpdateNullableString(64),
    sessionId: optionalUpdateNullableString(64),
    attendanceRecorded: z.boolean().optional(),
    equipmentIds: z.array(z.string()).optional(),
  })
  .refine(
    (value) =>
      value.projectId !== undefined ||
      value.roomStudioId !== undefined ||
      value.clientId !== undefined ||
      value.bookingFor !== undefined ||
      value.notes !== undefined ||
      value.date !== undefined ||
      value.slotId !== undefined ||
      value.status !== undefined ||
      value.clientName !== undefined ||
      value.projectName !== undefined ||
      value.projectNumber !== undefined ||
      value.engineerId !== undefined ||
      value.sessionId !== undefined ||
      value.attendanceRecorded !== undefined ||
      value.equipmentIds !== undefined,
    { message: "At least one field is required" },
  );

export type UpdateProjectBookingInput = z.infer<typeof updateProjectBookingSchema>;

const _createContractCheck: CreateProjectBookingDto = {} as CreateProjectBookingInput;
const _updateContractCheck: UpdateProjectBookingDto = {} as UpdateProjectBookingInput;
