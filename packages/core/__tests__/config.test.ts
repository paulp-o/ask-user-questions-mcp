import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";

import {
  AUQConfigSchema,
  DEFAULT_CONFIG,
  getWebApiKey,
  getWebEndpoint,
  getWebMode,
  getWebTimeout,
  isWebForwardingEnabled,
  loadConfig,
  resetToDefaults,
  type AUQConfig,
} from "../src/config/index.js";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe("config module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToDefaults();
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.AUQ_DEFAULT_ENDPOINT;
  });

  it("loads defaults when no config file exists", () => {
    (fs.existsSync as unknown as { mockReturnValue: (value: boolean) => void }).mockReturnValue(false);

    const config = loadConfig();

    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("default values match expected defaults", () => {
    expect(DEFAULT_CONFIG.maxOptions).toBe(5);
    expect(DEFAULT_CONFIG.maxQuestions).toBe(5);
    expect(DEFAULT_CONFIG.recommendedOptions).toBe(4);
    expect(DEFAULT_CONFIG.recommendedQuestions).toBe(4);
    expect(DEFAULT_CONFIG.sessionTimeout).toBe(0);
    expect(DEFAULT_CONFIG.retentionPeriod).toBe(604800000);
    expect(DEFAULT_CONFIG.language).toBe("auto");
    expect(DEFAULT_CONFIG.theme).toBe("system");
    expect(DEFAULT_CONFIG.autoSelectRecommended).toBe(true);
    expect(DEFAULT_CONFIG.renderer).toBe("opentui");
    expect(DEFAULT_CONFIG.staleThreshold).toBe(7200000);
    expect(DEFAULT_CONFIG.notifyOnStale).toBe(true);
    expect(DEFAULT_CONFIG.staleAction).toBe("warn");
    expect(DEFAULT_CONFIG.notifications).toEqual({
      enabled: true,
      sound: true,
    });
    expect(DEFAULT_CONFIG.updateCheck).toBe(true);
  });

  it("exports config types", () => {
    const typedConfig: AUQConfig = DEFAULT_CONFIG;

    expect(typedConfig).toEqual(DEFAULT_CONFIG);
  });

  it("validates web config schema", () => {
    const result = AUQConfigSchema.safeParse({
      web: {
        endpoint: "https://example.com",
        apiKey: "sk-test",
        mode: "web",
        timeout: 15000,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.web?.endpoint).toBe("https://example.com");
      expect(result.data.web?.apiKey).toBe("sk-test");
      expect(result.data.web?.mode).toBe("web");
      expect(result.data.web?.timeout).toBe(15000);
    }
  });

  it("rejects invalid web endpoint type", () => {
    const result = AUQConfigSchema.safeParse({
      web: { endpoint: 123 },
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid web mode", () => {
    const result = AUQConfigSchema.safeParse({
      web: { mode: "invalid" },
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid web timeout values", () => {
    const negative = AUQConfigSchema.safeParse({
      web: { timeout: -1 },
    });
    const nonNumber = AUQConfigSchema.safeParse({
      web: { timeout: "1000" },
    });

    expect(negative.success).toBe(false);
    expect(nonNumber.success).toBe(false);
  });

  it("applies web defaults for missing optional fields", () => {
    const result = AUQConfigSchema.safeParse({ web: {} });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.web?.mode).toBe("auto");
      expect(result.data.web?.timeout).toBe(300000);
    }
  });

  it("allows empty web field", () => {
    const result = AUQConfigSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("returns explicit web endpoint when set", () => {
    const endpoint = getWebEndpoint({
      ...DEFAULT_CONFIG,
      web: { endpoint: "https://configured.example", mode: "auto", timeout: 300000 },
    });

    expect(endpoint).toBe("https://configured.example");
  });

  it("returns AUQ_DEFAULT_ENDPOINT when endpoint not set", () => {
    process.env.AUQ_DEFAULT_ENDPOINT = "https://env.example";

    const endpoint = getWebEndpoint({
      ...DEFAULT_CONFIG,
      web: { mode: "auto", timeout: 300000 },
    });

    expect(endpoint).toBe("https://env.example");
  });

  it("returns undefined endpoint when neither config nor env are set", () => {
    delete process.env.AUQ_DEFAULT_ENDPOINT;

    const endpoint = getWebEndpoint({
      ...DEFAULT_CONFIG,
      web: { mode: "auto", timeout: 300000 },
    });

    expect(endpoint).toBeUndefined();
  });

  it("returns configured web api key", () => {
    const apiKey = getWebApiKey({
      ...DEFAULT_CONFIG,
      web: { apiKey: "sk-configured", mode: "auto", timeout: 300000 },
    });

    expect(apiKey).toBe("sk-configured");
  });

  it("returns configured web mode or auto default", () => {
    const configured = getWebMode({
      ...DEFAULT_CONFIG,
      web: { mode: "local", timeout: 300000 },
    });
    const fallback = getWebMode(DEFAULT_CONFIG);

    expect(configured).toBe("local");
    expect(fallback).toBe("auto");
  });

  it("returns configured web timeout or default", () => {
    const configured = getWebTimeout({
      ...DEFAULT_CONFIG,
      web: { mode: "auto", timeout: 120000 },
    });
    const fallback = getWebTimeout(DEFAULT_CONFIG);

    expect(configured).toBe(120000);
    expect(fallback).toBe(300000);
  });

  it("enables forwarding in auto mode when api key and endpoint exist", () => {
    const enabled = isWebForwardingEnabled({
      ...DEFAULT_CONFIG,
      web: {
        mode: "auto",
        apiKey: "sk-test",
        endpoint: "https://example.com",
        timeout: 300000,
      },
    });

    expect(enabled).toBe(true);
  });

  it("disables forwarding when mode is local", () => {
    const enabled = isWebForwardingEnabled({
      ...DEFAULT_CONFIG,
      web: {
        mode: "local",
        apiKey: "sk-test",
        endpoint: "https://example.com",
        timeout: 300000,
      },
    });

    expect(enabled).toBe(false);
  });

  it("enables forwarding in web mode when api key is set", () => {
    const enabled = isWebForwardingEnabled({
      ...DEFAULT_CONFIG,
      web: {
        mode: "web",
        apiKey: "sk-test",
        timeout: 300000,
      },
    });

    expect(enabled).toBe(true);
  });

  it("disables forwarding when api key is missing", () => {
    const enabledAuto = isWebForwardingEnabled({
      ...DEFAULT_CONFIG,
      web: {
        mode: "auto",
        endpoint: "https://example.com",
        timeout: 300000,
      },
    });
    const enabledWeb = isWebForwardingEnabled({
      ...DEFAULT_CONFIG,
      web: {
        mode: "web",
        timeout: 300000,
      },
    });

    expect(enabledAuto).toBe(false);
    expect(enabledWeb).toBe(false);
  });

  it("disables forwarding in web mode when api key is missing", () => {
    const enabled = isWebForwardingEnabled({
      ...DEFAULT_CONFIG,
      web: {
        mode: "web",
        timeout: 300000,
      },
    });

    expect(enabled).toBe(false);
  });

  it("disables forwarding in auto mode when endpoint is unavailable", () => {
    delete process.env.AUQ_DEFAULT_ENDPOINT;

    const enabled = isWebForwardingEnabled({
      ...DEFAULT_CONFIG,
      web: {
        mode: "auto",
        apiKey: "sk-test",
        timeout: 300000,
      },
    });

    expect(enabled).toBe(false);
  });

  it("merges nested web config with local endpoint overriding global", () => {
    const existsSyncMock = fs.existsSync as unknown as {
      mockImplementation: (impl: (path: string) => boolean) => void;
    };
    const readFileSyncMock = fs.readFileSync as unknown as {
      mockImplementation: (impl: (path: string) => string) => void;
    };

    existsSyncMock.mockImplementation((path: string) => path.endsWith(".auqrc.json"));
    readFileSyncMock.mockImplementation((path: string) => {
      if (path.includes("/auq/.auqrc.json")) {
        return JSON.stringify({
          web: {
            apiKey: "sk-global",
            endpoint: "https://global.example",
            mode: "auto",
          },
        });
      }

      if (path.endsWith("/.auqrc.json")) {
        return JSON.stringify({
          web: {
            endpoint: "https://local.example",
          },
        });
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    const config = loadConfig();

    expect(config.web?.endpoint).toBe("https://local.example");
    expect(config.web?.apiKey).toBe("sk-global");
    expect(config.web?.mode).toBe("auto");
  });
});