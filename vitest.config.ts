import { defineConfig } from "vitest/config";
import path from "node:path";

// BodyOS test suite (Week 9: Testing).
// Run with:  npm test
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    // Fast retries in tests; the real app waits longer between retries.
    env: { CLAUDE_RETRY_BASE_MS: "1", ANTHROPIC_API_KEY: "test-key", USDA_API_KEY: "test-key" },
  },
});
