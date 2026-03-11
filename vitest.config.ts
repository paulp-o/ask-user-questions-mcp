import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "opensrc/**",
      "node_modules/**",
      "dist/**",
      "oc-docs-for-references/**",
      ".opencode/**/node_modules/**",
      "src/tui-opentui/**",
    ],
  },
});