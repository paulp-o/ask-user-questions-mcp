import { describe, it, expect } from "vitest";
import { AUQConfigSchema } from "../types.js";
import { DEFAULT_CONFIG } from "../defaults.js";

describe("updateCheck config", () => {
  it("DEFAULT_CONFIG includes updateCheck: true", () => {
    expect(DEFAULT_CONFIG.updateCheck).toBe(true);
  });

  it("schema accepts updateCheck: true", () => {
    const result = AUQConfigSchema.parse({ updateCheck: true });
    expect(result.updateCheck).toBe(true);
  });

  it("schema accepts updateCheck: false", () => {
    const result = AUQConfigSchema.parse({ updateCheck: false });
    expect(result.updateCheck).toBe(false);
  });

  it("schema defaults updateCheck to true when missing", () => {
    const result = AUQConfigSchema.parse({});
    expect(result.updateCheck).toBe(true);
  });

  it("partial schema retains default for updateCheck when not provided", () => {
    const result = AUQConfigSchema.partial().parse({ maxOptions: 8 });
    // Zod .default(true) still applies even when field is omitted in partial parse
    expect(result.updateCheck).toBe(true);
  });

  it("schema rejects non-boolean updateCheck", () => {
    expect(() => AUQConfigSchema.parse({ updateCheck: "yes" })).toThrow();
  });

  it("updateCheck coexists with other config values", () => {
    const result = AUQConfigSchema.parse({ updateCheck: false });
    // Other defaults should still be set
    expect(result.updateCheck).toBe(false);
    expect(result.maxOptions).toBeDefined();
  });
});