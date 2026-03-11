import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";

import {
  loadConfig,
  getConfigPaths,
  resetToDefaults,
} from "../ConfigLoader.js";
import { DEFAULT_CONFIG } from "../defaults.js";

// Mock fs and os modules
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

describe("ConfigLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToDefaults();
    // Reset environment variables
    delete process.env.XDG_CONFIG_HOME;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadConfig", () => {
    it("should return default config when no config files exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it("should load and merge global config", () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return path === "/home/testuser/.config/auq/.auqrc.json";
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ maxOptions: 6, language: "ko" }),
      );

      const config = loadConfig();

      expect(config.maxOptions).toBe(6);
      expect(config.language).toBe("ko");
      expect(config.maxQuestions).toBe(DEFAULT_CONFIG.maxQuestions);
    });

    it("should load local config when it exists", () => {
      const cwd = process.cwd();
      const localPath = `${cwd}/.auqrc.json`;

      // Only local config exists
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === localPath;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ maxOptions: 8, language: "ko" }),
      );

      const config = loadConfig();

      expect(config.maxOptions).toBe(8);
      expect(config.language).toBe("ko");
      // Defaults still apply for non-specified values
      expect(config.maxQuestions).toBe(DEFAULT_CONFIG.maxQuestions);
    });

    it("should handle invalid JSON gracefully", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("{ invalid json }");

      // Should not throw
      const config = loadConfig();

      // Should fall back to defaults
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it("should validate config values with Zod", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ maxOptions: "not a number" }),
      );

      const config = loadConfig();

      // Invalid value should be ignored, defaults used
      expect(config.maxOptions).toBe(DEFAULT_CONFIG.maxOptions);
    });

    it("should respect XDG_CONFIG_HOME environment variable", () => {
      process.env.XDG_CONFIG_HOME = "/custom/config";
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return path === "/custom/config/auq/.auqrc.json";
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ theme: "dark" }),
      );

      const config = loadConfig();

      expect(config.theme).toBe("dark");
    });
  });

  describe("getConfigPaths", () => {
    it("should return correct paths", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const paths = getConfigPaths();

      expect(paths.global).toContain(".config/auq/.auqrc.json");
      expect(paths.local).toContain(".auqrc.json");
      expect(paths.localExists).toBe(false);
      expect(paths.globalExists).toBe(false);
    });

    it("should detect existing files", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const paths = getConfigPaths();

      expect(paths.localExists).toBe(true);
      expect(paths.globalExists).toBe(true);
    });
  });

  describe("stale/orphan session config options", () => {
    it("should include stale config defaults when no config files exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config.staleThreshold).toBe(7200000);
      expect(config.notifyOnStale).toBe(true);
      expect(config.staleAction).toBe("warn");
    });

    it("should load staleThreshold from config file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ staleThreshold: 3600000 }),
      );

      const config = loadConfig();

      expect(config.staleThreshold).toBe(3600000);
    });

    it("should load staleAction from config file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ staleAction: "archive" }),
      );

      const config = loadConfig();

      expect(config.staleAction).toBe("archive");
    });

    it("should load notifyOnStale from config file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ notifyOnStale: false }),
      );

      const config = loadConfig();

      expect(config.notifyOnStale).toBe(false);
    });

    it("should fall back to default for invalid staleAction value", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ staleAction: "invalid_action" }),
      );

      const config = loadConfig();

      // Invalid enum value should be ignored, default used
      expect(config.staleAction).toBe(DEFAULT_CONFIG.staleAction);
    });

    it("should reject negative staleThreshold value", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ staleThreshold: -1000 }),
      );

      const config = loadConfig();

      // Negative value should be rejected by min(0), default used
      expect(config.staleThreshold).toBe(DEFAULT_CONFIG.staleThreshold);
    });
  });

  describe("renderer config options", () => {
    it("should have 'ink' as default renderer when no config files exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config.renderer).toBe("ink");
    });

    it("should include renderer in DEFAULT_CONFIG as 'ink'", () => {
      expect(DEFAULT_CONFIG.renderer).toBe("ink");
    });

    it("should load renderer: 'opentui' from config file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ renderer: "opentui" }),
      );

      const config = loadConfig();

      expect(config.renderer).toBe("opentui");
    });

    it("should load renderer: 'ink' from config file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ renderer: "ink" }),
      );

      const config = loadConfig();

      expect(config.renderer).toBe("ink");
    });

    it("should fall back to 'ink' for invalid renderer value", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ renderer: "chrome" }),
      );

      const config = loadConfig();

      // Invalid enum value should be ignored, default ('ink') used
      expect(config.renderer).toBe(DEFAULT_CONFIG.renderer);
      expect(config.renderer).toBe("ink");
    });

    it("should preserve other config values alongside renderer setting", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ renderer: "opentui", theme: "dark" }),
      );

      const config = loadConfig();

      expect(config.renderer).toBe("opentui");
      expect(config.theme).toBe("dark");
      expect(config.maxOptions).toBe(DEFAULT_CONFIG.maxOptions);
    });
  });
});
