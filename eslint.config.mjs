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
  // React component code (currently just packages/ui; apps/web and
  // apps/desktop get this glob added in M7/M8 when they gain real source
  // of their own). Each config object from the shared react preset is
  // scoped to this glob rather than applied repo-wide.
  ...react.map((config) => ({ ...config, files: ["packages/ui/**/*.{ts,tsx}"] })),
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/.next/**",
      "**/build/**",
      "**/src-tauri/target/**",
      "**/src/generated/**",
      "pnpm-lock.yaml",
    ],
  },
];
