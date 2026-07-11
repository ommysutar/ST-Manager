import { z } from "zod";

export const platformStudioListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["name", "createdAt", "status", "totalUsers"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.string().trim().optional(),
});

export type PlatformStudioListQueryInput = z.infer<typeof platformStudioListQuerySchema>;

export const platformDeleteStudioSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export type PlatformDeleteStudioInput = z.infer<typeof platformDeleteStudioSchema>;

export const platformUpdateProfileSchema = z
  .object({
    currentPassword: z.string().min(8),
    email: z.string().trim().email().optional(),
    newPassword: z.string().min(8).optional(),
    confirmNewPassword: z.string().min(8).optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword || data.confirmNewPassword) {
        return data.newPassword === data.confirmNewPassword;
      }
      return true;
    },
    { message: "Passwords do not match", path: ["confirmNewPassword"] },
  )
  .refine((data) => Boolean(data.email?.trim()) || Boolean(data.newPassword), {
    message: "Provide a new email and/or new password",
  });

export type PlatformUpdateProfileInput = z.infer<typeof platformUpdateProfileSchema>;

export const platformPermanentDeleteStudioSchema = z.object({
  confirmation: z.literal("DELETE FOREVER"),
});

export type PlatformPermanentDeleteStudioInput = z.infer<
  typeof platformPermanentDeleteStudioSchema
>;

export const platformActivationCodeListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["code", "status", "createdAt", "expiresAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.string().trim().optional(),
});

export type PlatformActivationCodeListQueryInput = z.infer<
  typeof platformActivationCodeListQuerySchema
>;

export const platformGenerateActivationCodesSchema = z.object({
  quantity: z.union([z.literal(1), z.literal(5), z.literal(10), z.literal(25), z.literal(50)]),
  expiresAt: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type PlatformGenerateActivationCodesInput = z.infer<
  typeof platformGenerateActivationCodesSchema
>;

export const platformDeleteActivationCodeSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export type PlatformDeleteActivationCodeInput = z.infer<typeof platformDeleteActivationCodeSchema>;

export const platformLicenseListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z
    .enum(["code", "status", "createdAt", "expiresAt", "licenseType"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.string().trim().optional(),
  licenseType: z.string().trim().optional(),
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
});

export type PlatformLicenseListQueryInput = z.infer<typeof platformLicenseListQuerySchema>;

export const platformGenerateLicensesSchema = z
  .object({
    quantity: z.union([
      z.literal(1),
      z.literal(5),
      z.literal(10),
      z.literal(25),
      z.literal(50),
      z.literal(100),
    ]),
    licenseType: z.enum(["LIFETIME", "TRIAL", "SUBSCRIPTION"]),
    subscriptionMonths: z
      .union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)])
      .optional()
      .nullable(),
    customerName: z.string().trim().max(200).optional().nullable(),
    phone: z.string().trim().max(40).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    expiresAt: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
  })
  .superRefine((value, ctx) => {
    if (value.licenseType === "SUBSCRIPTION" && !value.subscriptionMonths) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "subscriptionMonths is required for SUBSCRIPTION licenses",
        path: ["subscriptionMonths"],
      });
    }
  });

export type PlatformGenerateLicensesInput = z.infer<typeof platformGenerateLicensesSchema>;

export const platformDeleteLicenseSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export type PlatformDeleteLicenseInput = z.infer<typeof platformDeleteLicenseSchema>;
