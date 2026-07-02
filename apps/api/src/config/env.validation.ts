import { apiEnvSchema, type ApiEnv } from "@st-manager/validation";

/**
 * Passed to `ConfigModule.forRoot({ validate })`. Nest invokes this with the
 * raw process environment; this function never reads `process.env` itself,
 * keeping all environment access funneled through `ConfigService`.
 */
export function validateEnv(config: Record<string, unknown>): ApiEnv {
  const result = apiEnvSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
}
