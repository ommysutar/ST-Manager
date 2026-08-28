import type { CreateProjectDto, UpdateProjectDto } from "@st-manager/contracts";
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

function optionalEmail() {
  return z.preprocess(
    preprocessOptionalString,
    z
      .string()
      .trim()
      .max(255)
      .optional()
      .transform((value) => (value === undefined || value === "" ? null : value))
      .refine((value) => value === null || z.string().email().safeParse(value).success, {
        message: "Invalid email address",
      }),
  );
}

function optionalUpdateEmail() {
  return z
    .union([z.string().trim().email().max(255), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value))
    .optional();
}

function optionalUpdateNullableString(max: number) {
  return z
    .union([z.string().trim().max(max), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value))
    .optional();
}

const payloadArrayFields = {
  selectedServiceIds: z.array(z.string()).optional().default([]),
  tasks: z.array(z.unknown()).optional().default([]),
  files: z.array(z.unknown()).optional().default([]),
  links: z.array(z.unknown()).optional().default([]),
  expenses: z.array(z.unknown()).optional().default([]),
  sessionIds: z.array(z.string()).optional().default([]),
  bookingIds: z.array(z.string()).optional().default([]),
  invoiceIds: z.array(z.string()).optional().default([]),
};

export const createProjectSchema = z.object({
  source: z.enum(["inquiry", "manual"]),
  inquiryId: optionalNullableString(64),
  clientId: optionalNullableString(64),
  projectName: z.string().trim().min(1, "Project name is required").max(120),
  clientName: z.string().trim().min(1, "Client name is required").max(120),
  clientMobile: optionalNullableString(64),
  clientEmail: optionalEmail(),
  projectCategory: optionalNullableString(120),
  status: z.string().trim().max(32).optional().default("active"),
  assignedEngineer: z.string().trim().max(120).optional().default(""),
  planId: optionalNullableString(64),
  advanceReceived: z.number().optional().default(0),
  remainingBalance: z.number().optional().default(0),
  grandTotal: z.number().optional().default(0),
  notes: optionalNullableString(2000),
  quotation: z.unknown().optional(),
  ...payloadArrayFields,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    source: z.enum(["inquiry", "manual"]).optional(),
    inquiryId: optionalUpdateNullableString(64),
    clientId: optionalUpdateNullableString(64),
    projectName: z.string().trim().min(1, "Project name is required").max(120).optional(),
    clientName: z.string().trim().min(1, "Client name is required").max(120).optional(),
    clientMobile: optionalUpdateNullableString(64),
    clientEmail: optionalUpdateEmail(),
    projectCategory: optionalUpdateNullableString(120),
    status: z.string().trim().max(32).optional(),
    assignedEngineer: z.string().trim().max(120).optional(),
    planId: optionalUpdateNullableString(64),
    advanceReceived: z.number().optional(),
    remainingBalance: z.number().optional(),
    grandTotal: z.number().optional(),
    notes: optionalUpdateNullableString(2000),
    quotation: z.unknown().optional(),
    selectedServiceIds: z.array(z.string()).optional(),
    tasks: z.array(z.unknown()).optional(),
    files: z.array(z.unknown()).optional(),
    links: z.array(z.unknown()).optional(),
    expenses: z.array(z.unknown()).optional(),
    sessionIds: z.array(z.string()).optional(),
    bookingIds: z.array(z.string()).optional(),
    invoiceIds: z.array(z.string()).optional(),
  })
  .refine(
    (value) =>
      value.source !== undefined ||
      value.inquiryId !== undefined ||
      value.clientId !== undefined ||
      value.projectName !== undefined ||
      value.clientName !== undefined ||
      value.clientMobile !== undefined ||
      value.clientEmail !== undefined ||
      value.projectCategory !== undefined ||
      value.status !== undefined ||
      value.assignedEngineer !== undefined ||
      value.planId !== undefined ||
      value.advanceReceived !== undefined ||
      value.remainingBalance !== undefined ||
      value.grandTotal !== undefined ||
      value.notes !== undefined ||
      value.quotation !== undefined ||
      value.selectedServiceIds !== undefined ||
      value.tasks !== undefined ||
      value.files !== undefined ||
      value.links !== undefined ||
      value.expenses !== undefined ||
      value.sessionIds !== undefined ||
      value.bookingIds !== undefined ||
      value.invoiceIds !== undefined,
    { message: "At least one field is required" },
  );

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

const _createContractCheck: CreateProjectDto = {} as CreateProjectInput;
const _updateContractCheck: UpdateProjectDto = {} as UpdateProjectInput;
