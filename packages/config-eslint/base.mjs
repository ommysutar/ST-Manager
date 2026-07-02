import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Base ESLint flat config shared by every ST Manager app and package.
 * Framework-specific rules (React, NestJS) live in ./react.mjs and ./nestjs.mjs,
 * which both extend this base.
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", ".turbo/**", "build/**", ".next/**"],
  },
);
