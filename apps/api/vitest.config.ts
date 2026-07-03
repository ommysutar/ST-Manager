import { mergeConfig } from "vitest/config";

import shared from "../../vitest.shared";

export default mergeConfig(shared, {
  test: {
    include: ["src/**/*.spec.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
