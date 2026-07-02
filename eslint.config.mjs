import base from "@st-manager/config-eslint/base";

export default [
  ...base,
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
