import type { CreateStudioRoomDto, UpdateStudioRoomDto } from "@st-manager/contracts";
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

export const createStudioRoomSchema = z.object({
  name: z.string().trim().min(1).max(120),
  roomName: optionalNullableString(120),
  description: z.string().trim().max(2000).optional().default(""),
  color: z.string().trim().max(32).optional().default("#6366f1"),
  active: z.boolean().optional().default(true),
});

export type CreateStudioRoomInput = z.infer<typeof createStudioRoomSchema>;

export const updateStudioRoomSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    roomName: optionalUpdateNullableString(120),
    description: z.string().trim().max(2000).optional(),
    color: z.string().trim().max(32).optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.roomName !== undefined ||
      value.description !== undefined ||
      value.color !== undefined ||
      value.active !== undefined,
    { message: "At least one field is required" },
  );

export type UpdateStudioRoomInput = z.infer<typeof updateStudioRoomSchema>;

const _createContractCheck: CreateStudioRoomDto = {} as CreateStudioRoomInput;
const _updateContractCheck: UpdateStudioRoomDto = {} as UpdateStudioRoomInput;
