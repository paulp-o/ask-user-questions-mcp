import { describe, it, expect } from "vitest";
import { AUQConfigSchema, NotificationConfigSchema } from "../config-types.js";

describe("config-types", () => {
  it("AUQConfigSchema parses defaults correctly", () => {
    const result = AUQConfigSchema.parse({});
    expect(result.renderer).toBe("opentui");
    expect(result.maxOptions).toBe(5);
    expect(result.theme).toBe("system");
  });

  it("renderer accepts ink, opentui, web", () => {
    expect(AUQConfigSchema.parse({ renderer: "ink" }).renderer).toBe("ink");
    expect(AUQConfigSchema.parse({ renderer: "opentui" }).renderer).toBe("opentui");
    expect(AUQConfigSchema.parse({ renderer: "web" }).renderer).toBe("web");
  });

  it("renderer rejects invalid values", () => {
    expect(() => AUQConfigSchema.parse({ renderer: "invalid" })).toThrow();
  });

  it("NotificationConfigSchema parses defaults", () => {
    const result = NotificationConfigSchema.parse({});
    expect(result.enabled).toBe(true);
    expect(result.sound).toBe(true);
  });
});