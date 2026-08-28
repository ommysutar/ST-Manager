import type {
  CreateBookingSlotDefinitionDto,
  UpdateBookingSlotDefinitionDto,
} from "@st-manager/contracts";
import { z } from "zod";

const hourSchema = z.number().int().min(0).max(23);
const minuteSchema = z.number().int().min(0).max(59);

export const createBookingSlotDefinitionSchema = z.object({
  label: z.string().trim().min(1).max(120),
  startHour: hourSchema,
  startMinute: minuteSchema.optional().default(0),
  endHour: hourSchema,
  endMinute: minuteSchema.optional().default(0),
  isCustom: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export type CreateBookingSlotDefinitionInput = z.infer<typeof createBookingSlotDefinitionSchema>;

export const updateBookingSlotDefinitionSchema = z
  .object({
    label: z.string().trim().min(1).max(120).optional(),
    startHour: hourSchema.optional(),
    startMinute: minuteSchema.optional(),
    endHour: hourSchema.optional(),
    endMinute: minuteSchema.optional(),
    isCustom: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (value) =>
      value.label !== undefined ||
      value.startHour !== undefined ||
      value.startMinute !== undefined ||
      value.endHour !== undefined ||
      value.endMinute !== undefined ||
      value.isCustom !== undefined ||
      value.sortOrder !== undefined,
    { message: "At least one field is required" },
  );

export type UpdateBookingSlotDefinitionInput = z.infer<typeof updateBookingSlotDefinitionSchema>;

const _createContractCheck: CreateBookingSlotDefinitionDto = {} as CreateBookingSlotDefinitionInput;
const _updateContractCheck: UpdateBookingSlotDefinitionDto = {} as UpdateBookingSlotDefinitionInput;
