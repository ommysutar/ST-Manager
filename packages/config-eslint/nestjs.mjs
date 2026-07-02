import base from "./base.mjs";

/**
 * ESLint flat config for the NestJS API (apps/api), extending the shared base
 * config with allowances for decorator-heavy Nest code.
 */
export default [
  ...base,
  {
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
];
