import base from "@st-manager/config-eslint/base";

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
