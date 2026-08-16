import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "workers/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/utils/**/*.ts",
        "src/database/**/*.ts",
        "src/auth/**/*.ts",
        "workers/cloud-backup/src/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/types.ts",
        "**/test-helpers.ts",
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
