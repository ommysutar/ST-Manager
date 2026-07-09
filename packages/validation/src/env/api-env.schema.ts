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
    CORS_ORIGIN: z.string().trim().optional(),
    DATABASE_URL: z.string().trim().min(1).optional(),
    SQLITE_URL: z.string().trim().min(1).optional(),
    AUTH_SECRET: z.string().trim().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().trim().min(1).default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().trim().min(1).default("7d"),
    AI_PROVIDER: z.enum(["openai", "mock"]).default("mock"),
    AI_API_KEY: z.string().trim().optional(),
    AI_MODEL: z.string().trim().min(1).default("gpt-4o-mini"),
    EMAIL_PROVIDER: z.enum(["console", "noop", "resend"]).default("resend"),
    APP_BASE_URL: z.string().trim().url().optional(),
    RESEND_API_KEY: z.string().trim().optional(),
    EMAIL_FROM: z.string().trim().email().optional(),
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

    if (env.AI_PROVIDER === "openai" && !env.AI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AI_API_KEY"],
        message: "AI_API_KEY is required when AI_PROVIDER=openai.",
      });
    }

    if (env.EMAIL_PROVIDER === "resend" && env.NODE_ENV === "production") {
      if (!env.RESEND_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend in production.",
        });
      }
      if (!env.EMAIL_FROM) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["EMAIL_FROM"],
          message: "EMAIL_FROM is required when EMAIL_PROVIDER=resend in production.",
        });
      }
    }
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;
