import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@auq/shared": resolve(__dirname, "packages/shared/src/index.ts"),
    },
  },
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