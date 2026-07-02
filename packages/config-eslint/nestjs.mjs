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
      // Nest's DI resolves constructor-injected providers via
      // emitDecoratorMetadata, which needs a value import (not `import
      // type`) to emit a real `design:paramtypes` reference at runtime.
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];
