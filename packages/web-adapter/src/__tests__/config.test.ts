import { describe, expect, it, vi } from "vitest";

import { validateWebAdapterConfig } from "../config.js";

describe("validateWebAdapterConfig", () => {
  it("validates and returns config with defaults applied", () => {
    const config = validateWebAdapterConfig({
      apiUrl: "https://example.com",
      apiKey: "test-key",
    });

    expect(config).toEqual({
      apiUrl: "https://example.com",
      apiKey: "test-key",
      pollInterval: 3000,
      sessionTimeout: 0,
      maxPollErrors: 3,
      maxRetries: 3,
      retryBaseDelayMs: 1000,
      fetchFn: undefined,
    });
  });

  it("throws on empty or missing apiUrl", () => {
    expect(() =>
      validateWebAdapterConfig({
        apiUrl: "",
        apiKey: "test-key",
      }),
    ).toThrow("apiUrl is required");

    expect(() =>
      validateWebAdapterConfig({
        apiUrl: "   ",
        apiKey: "test-key",
      }),
    ).toThrow("apiUrl is required");
  });

  it("throws on empty or missing apiKey", () => {
    expect(() =>
      validateWebAdapterConfig({
        apiUrl: "https://example.com",
        apiKey: "",
      }),
    ).toThrow("apiKey is required");

    expect(() =>
      validateWebAdapterConfig({
        apiUrl: "https://example.com",
        apiKey: "   ",
      }),
    ).toThrow("apiKey is required");
  });

  it("throws on pollInterval < 1000 or > 30000", () => {
    expect(() =>
      validateWebAdapterConfig({
        apiUrl: "https://example.com",
        apiKey: "test-key",
        pollInterval: 999,
      }),
    ).toThrow("pollInterval must be between 1000 and 30000");

    expect(() =>
      validateWebAdapterConfig({
        apiUrl: "https://example.com",
        apiKey: "test-key",
        pollInterval: 30001,
      }),
    ).toThrow("pollInterval must be between 1000 and 30000");
  });

  it("strips trailing slash from apiUrl", () => {
    const config = validateWebAdapterConfig({
      apiUrl: "https://example.com/",
      apiKey: "test-key",
    });

    expect(config.apiUrl).toBe("https://example.com");
  });

  it("preserves custom values when provided", () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const config = validateWebAdapterConfig({
      apiUrl: "https://example.com/api",
      apiKey: "custom-key",
      pollInterval: 5000,
      sessionTimeout: 45000,
      maxPollErrors: 5,
      maxRetries: 6,
      retryBaseDelayMs: 250,
      fetchFn,
    });

    expect(config).toEqual({
      apiUrl: "https://example.com/api",
      apiKey: "custom-key",
      pollInterval: 5000,
      sessionTimeout: 45000,
      maxPollErrors: 5,
      maxRetries: 6,
      retryBaseDelayMs: 250,
      fetchFn,
    });
  });
});