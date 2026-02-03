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
});
