import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";

import { runConfigCommand } from "../config.js";
import { DEFAULT_CONFIG } from "../../../config/defaults.js";

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

describe("config command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    delete process.env.XDG_CONFIG_HOME;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Default: no config files exist
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  // ── Config Get ──────────────────────────────────────────────────

  describe("config get", () => {
    it("should show all config values with defaults when no config files exist", async () => {
      await runConfigCommand(["get"]);

      // Should print key=value lines for all known keys
      expect(consoleLogSpy).toHaveBeenCalled();
      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("maxOptions = 5");
      expect(allOutput).toContain("sessionTimeout = 0");
      expect(allOutput).toContain("staleThreshold = 7200000");
      expect(allOutput).toContain("notifyOnStale = true");
      expect(allOutput).toContain("staleAction = warn");
      expect(allOutput).toContain("notifications.enabled = true");
      expect(allOutput).toContain("notifications.sound = true");
    });

    it("should show specific key value", async () => {
      await runConfigCommand(["get", "maxOptions"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("maxOptions = 5");
    });

    it("should show nested key value with dot notation", async () => {
      await runConfigCommand(["get", "notifications.enabled"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("notifications.enabled = true");
    });

    it("should error on unknown key", async () => {
      await runConfigCommand(["get", "unknownKey"]);

      expect(process.exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("Unknown config key");
      expect(errorOutput).toContain("unknownKey");
    });

    it("should output valid JSON with --json flag for all config", async () => {
      await runConfigCommand(["get", "--json"]);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.success).toBe(true);
      expect(parsed.config).toBeDefined();
      expect(parsed.config.maxOptions).toBe(DEFAULT_CONFIG.maxOptions);
    });

    it("should output valid JSON with --json flag for specific key", async () => {
      await runConfigCommand(["get", "staleThreshold", "--json"]);

      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.success).toBe(true);
      expect(parsed.key).toBe("staleThreshold");
      expect(parsed.value).toBe(7200000);
    });

    it("should merge local config over defaults", async () => {
      const cwd = process.cwd();
      const localPath = `${cwd}/.auqrc.json`;

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === localPath;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ maxOptions: 8 }),
      );

      await runConfigCommand(["get", "maxOptions"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("maxOptions = 8");
    });
  });

  // ── Config Set ──────────────────────────────────────────────────

  describe("config set", () => {
    it("should write valid key to local config file", async () => {
      const cwd = process.cwd();
      const expectedPath = `${cwd}/.auqrc.json`;

      // Simulate directory exists but file does not
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === cwd;
      });

      await runConfigCommand(["set", "staleThreshold", "3600000"]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      expect(String(writeCall[0])).toBe(expectedPath);
      const written = JSON.parse(writeCall[1] as string);
      expect(written.staleThreshold).toBe(3600000);
    });

    it("should write to global config with --global flag", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "staleThreshold", "3600000", "--global"]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      expect(String(writeCall[0])).toContain(".config/auq/.auqrc.json");
    });

    it("should create directory if it doesn't exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "maxOptions", "8", "--global"]);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(".config/auq"),
        { recursive: true },
      );
    });

    it("should merge with existing config", async () => {
      const cwd = process.cwd();
      const localPath = `${cwd}/.auqrc.json`;

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path) === localPath || String(path) === cwd;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ maxOptions: 6 }),
      );

      await runConfigCommand(["set", "staleThreshold", "5000000"]);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      // Existing key should be preserved
      expect(written.maxOptions).toBe(6);
      // New key should be added
      expect(written.staleThreshold).toBe(5000000);
    });

    it("should error on unknown config key with valid keys list", async () => {
      await runConfigCommand(["set", "badKey", "value"]);

      expect(process.exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("Unknown config key");
      expect(errorOutput).toContain("badKey");
      // Should list valid keys
      expect(errorOutput).toContain("maxOptions");
      expect(errorOutput).toContain("staleThreshold");
    });

    it("should error on invalid value type", async () => {
      await runConfigCommand(["set", "maxOptions", "notanumber"]);

      expect(process.exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("Invalid value");
    });

    it("should coerce boolean string values correctly", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "notifyOnStale", "false"]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.notifyOnStale).toBe(false);
    });

    it("should validate enum values", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "staleAction", "archive"]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.staleAction).toBe("archive");
    });

    it("should reject invalid enum values", async () => {
      await runConfigCommand(["set", "staleAction", "invalid_action"]);

      expect(process.exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle nested key set with dot notation", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "notifications.enabled", "false"]);

      expect(process.exitCode).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.notifications.enabled).toBe(false);
    });

    it("should output JSON with --json flag", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await runConfigCommand(["set", "staleThreshold", "3600000", "--json"]);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.success).toBe(true);
      expect(parsed.key).toBe("staleThreshold");
      expect(parsed.value).toBe(3600000);
      expect(parsed.file).toBeDefined();
    });

    it("should error when key and value are missing", async () => {
      await runConfigCommand(["set"]);

      expect(process.exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ── Config help ─────────────────────────────────────────────────

  describe("config help", () => {
    it("should show usage help when no subcommand provided", async () => {
      await runConfigCommand([]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("Usage");
    });

    it("should show usage and set exitCode for unknown subcommand", async () => {
      await runConfigCommand(["unknown"]);

      expect(process.exitCode).toBe(1);
    });
  });
});