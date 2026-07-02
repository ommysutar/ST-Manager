import { z } from "zod";

/**
 * Environment contract for `apps/api`.
 *
 * PostgreSQL is the production provider and SQLite is the development
 * provider (ADR 0001), so `DATABASE_URL` / `SQLITE_URL` are only required
 * conditionally, based on `NODE_ENV`, instead of both being mandatory
 * everywhere.
 */
export const apiEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().trim().min(1).optional(),
    SQLITE_URL: z.string().trim().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when NODE_ENV=production (PostgreSQL is the production provider).",
      });
    }

    if (env.NODE_ENV !== "production" && !env.SQLITE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SQLITE_URL"],
        message: "SQLITE_URL is required when NODE_ENV is not production (SQLite is the development/test provider).",
      });
    }
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;
