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
    delete process.env.AUQ_WEB_API_KEY;
    delete process.env.AUQ_WEB_API_URL;
    delete process.env.AUQ_WEB_MODE;
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
    it("should have 'opentui' as default renderer when no config files exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config.renderer).toBe("opentui");
    });

    it("should include renderer in DEFAULT_CONFIG as 'opentui'", () => {
      expect(DEFAULT_CONFIG.renderer).toBe("opentui");
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

    it("should fall back to 'opentui' for invalid renderer value", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ renderer: "chrome" }),
      );

      const config = loadConfig();

      // Invalid enum value should be ignored, default ('opentui') used
      expect(config.renderer).toBe(DEFAULT_CONFIG.renderer);
      expect(config.renderer).toBe("opentui");
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

  describe("web config options", () => {
    it("should include web defaults when no config files exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loadConfig();

      expect(config.web.mode).toBe("local");
      expect(config.web.api_key).toBeUndefined();
      expect(config.web.api_url).toBeUndefined();
    });

    it("should load web.api_key from config file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ web: { api_key: "auq_sk_local_key" } }),
      );

      const config = loadConfig();

      expect(config.web.api_key).toBe("auq_sk_local_key");
    });

    it("should load web.api_url from config file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ web: { api_url: "https://self-hosted.example.com" } }),
      );

      const config = loadConfig();

      expect(config.web.api_url).toBe("https://self-hosted.example.com");
    });

    it("should fall back to default for invalid web.mode value", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ web: { mode: "invalid_mode" } }),
      );

      const config = loadConfig();

      expect(config.web.mode).toBe("local");
    });

    it("should default web.api_url to hosted URL when api_key is set", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ web: { api_key: "auq_sk_local_key" } }),
      );

      const config = loadConfig();

      expect(config.web.api_key).toBe("auq_sk_local_key");
      expect(config.web.api_url).toBe("https://auq.paulp.dev");
    });
  });

  describe("web config env var overrides", () => {
    it("should let AUQ_WEB_API_KEY override .auqrc web.api_key", () => {
      process.env.AUQ_WEB_API_KEY = "auq_sk_env_key";
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ web: { api_key: "auq_sk_file_key" } }),
      );

      const config = loadConfig();

      expect(config.web.api_key).toBe("auq_sk_env_key");
    });

    it("should let AUQ_WEB_API_URL override .auqrc web.api_url", () => {
      process.env.AUQ_WEB_API_URL = "https://env-hosted.example.com";
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ web: { api_url: "https://file-hosted.example.com" } }),
      );

      const config = loadConfig();

      expect(config.web.api_url).toBe("https://env-hosted.example.com");
    });

    it("should let AUQ_WEB_MODE override .auqrc web.mode", () => {
      process.env.AUQ_WEB_MODE = "web";
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ web: { mode: "local" } }),
      );

      const config = loadConfig();

      expect(config.web.mode).toBe("web");
    });

    it("should prioritize env vars over both global and local .auqrc", () => {
      const cwd = process.cwd();
      const localPath = `${cwd}/.auqrc.json`;
      const globalPath = "/home/testuser/.config/auq/.auqrc.json";

      process.env.AUQ_WEB_API_KEY = "auq_sk_env_priority";

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === localPath || String(path) === globalPath;
      });
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (String(path) === globalPath) {
          return JSON.stringify({ web: { api_key: "auq_sk_global" } });
        }

        return JSON.stringify({ web: { api_key: "auq_sk_local" } });
      });

      const config = loadConfig();

      expect(config.web.api_key).toBe("auq_sk_env_priority");
    });
  });
});
