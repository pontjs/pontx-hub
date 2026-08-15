import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
    // The full catalog now includes complete provider schemas and is routinely
    // initialized by integration-style tests on slower CI runners.
    testTimeout: 30_000
  }
});
