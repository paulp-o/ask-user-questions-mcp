import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";

import { DEFAULT_CONFIG, loadConfig, resetToDefaults, type AUQConfig } from "../src/config/index.js";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe("config module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToDefaults();
    delete process.env.XDG_CONFIG_HOME;
  });

  it("loads defaults when no config file exists", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

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
});