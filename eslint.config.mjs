import base from "@st-manager/config-eslint/base";
import react from "@st-manager/config-eslint/react";

export default [
  ...base,
  {
    // Decorator-heavy NestJS code trips these two generic rules; see
    // packages/config-eslint/nestjs.mjs for the source-of-truth rationale.
    files: ["apps/api/**/*.ts"],
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
  // React component code in shared UI and desktop app (apps/web gets this
  // glob in M8 when it gains real source of its own). Each config object from
  // the shared react preset is scoped to these globs rather than applied
  // repo-wide.
  ...react.map((config) => ({
    ...config,
    files: ["packages/ui/**/*.{ts,tsx}", "apps/desktop/**/*.{ts,tsx}", "apps/web/**/*.{ts,tsx}"],
  })),
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/.next/**",
      "**/build/**",
      "**/src-tauri/target/**",
      "**/src/generated/**",
      "apps/web/next-env.d.ts",
      "pnpm-lock.yaml",
    ],
  },
];
