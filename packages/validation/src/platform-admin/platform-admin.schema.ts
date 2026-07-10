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
