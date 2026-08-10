import path from "node:path";

import { mergeConfig } from "vitest/config";

import shared from "../../vitest.shared";

export default mergeConfig(shared, {
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.spec.ts"],
  },
});
