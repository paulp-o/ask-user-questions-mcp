/**
 * Unit tests for session utility functions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { homedir } from "os";

import { getSessionDirectory, resolveSessionDirectory } from "../utils.js";

describe("session utilities", () => {
  const originalEnv = { ...process.env };
  const originalPlatform = process.platform;

  beforeEach(() => {
    // Reset process.env to original state before each test
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Clean up process.env after each test
    process.env = { ...originalEnv };
  });

  describe("getSessionDirectory", () => {
    it("should return macOS XDG path when no env var is set", () => {
      // Mock platform to macOS
      vi.stubGlobal("process", {
        ...process,
        platform: "darwin",
      });

      // Ensure AUQ_SESSION_DIR is not set
      delete process.env.AUQ_SESSION_DIR;

      const result = getSessionDirectory();

      expect(result).toBe(
        `${homedir()}/Library/Application Support/auq/sessions`,
      );
    });

    it("should return Linux XDG path when no env var is set", () => {
      // Mock platform to Linux
      vi.stubGlobal("process", {
        ...process,
        platform: "linux",
      });

      // Ensure AUQ_SESSION_DIR is not set
      delete process.env.AUQ_SESSION_DIR;

      const result = getSessionDirectory();

      expect(result).toBe(`${homedir()}/.local/share/auq/sessions`);
    });

    it("should use AUQ_SESSION_DIR env var when set", () => {
      const customDir = "/custom/session/dir";
      process.env.AUQ_SESSION_DIR = customDir;

      const result = getSessionDirectory();

      expect(result).toBe(customDir);
    });

    it("should expand tilde in AUQ_SESSION_DIR env var", () => {
      process.env.AUQ_SESSION_DIR = "~/custom/sessions";

      const result = getSessionDirectory();

      expect(result).toBe(`${homedir()}/custom/sessions`);
    });

    it("should not expand tilde when AUQ_SESSION_DIR does not start with ~", () => {
      const customDir = "/absolute/path/to/sessions";
      process.env.AUQ_SESSION_DIR = customDir;

      const result = getSessionDirectory();

      expect(result).toBe(customDir);
    });

    it("should prefer AUQ_SESSION_DIR over XDG path", () => {
      const customDir = "/custom/sessions";
      process.env.AUQ_SESSION_DIR = customDir;

      // Mock platform to macOS
      vi.stubGlobal("process", {
        ...process,
        platform: "darwin",
      });

      const result = getSessionDirectory();

      // Should use env var, not the macOS default
      expect(result).toBe(customDir);
      expect(result).not.toBe(
        `${homedir()}/Library/Application Support/auq/sessions`,
      );
    });
  });

  describe("resolveSessionDirectory", () => {
    it("should return macOS path when platform is darwin", () => {
      vi.stubGlobal("process", {
        ...process,
        platform: "darwin",
      });

      const result = resolveSessionDirectory();

      expect(result).toBe(
        `${homedir()}/Library/Application Support/auq/sessions`,
      );
    });

    it("should return Linux path when platform is linux", () => {
      vi.stubGlobal("process", {
        ...process,
        platform: "linux",
      });

      const result = resolveSessionDirectory();

      expect(result).toBe(`${homedir()}/.local/share/auq/sessions`);
    });

    it("should return Windows path when platform is win32 with APPDATA", () => {
      vi.stubGlobal("process", {
        ...process,
        platform: "win32",
        env: {
          ...process.env,
          APPDATA: "C:/Users/Test/AppData/Roaming",
        },
      });

      const result = resolveSessionDirectory();

      // Note: join() uses forward slashes when running on Unix systems
      expect(result).toBe("C:/Users/Test/AppData/Roaming/auq/sessions");
    });

    it("should return Windows path with USERPROFILE fallback when APPDATA not set", () => {
      vi.stubGlobal("process", {
        ...process,
        platform: "win32",
        env: {
          ...process.env,
          APPDATA: undefined,
          USERPROFILE: "C:/Users/Test",
        },
      });

      const result = resolveSessionDirectory();

      // Note: join() uses forward slashes when running on Unix systems
      expect(result).toBe("C:/Users/Test/auq/sessions");
    });

    it("should return Linux XDG_DATA_HOME path when env var is set", () => {
      vi.stubGlobal("process", {
        ...process,
        platform: "linux",
        env: {
          ...process.env,
          XDG_DATA_HOME: "/custom/xdg/data",
        },
      });

      const result = resolveSessionDirectory();

      expect(result).toBe("/custom/xdg/data/auq/sessions");
    });

    it("should expand tilde in provided baseDir", () => {
      const result = resolveSessionDirectory("~/custom/base");

      expect(result).toBe(`${homedir()}/custom/base`);
    });

    it("should use provided baseDir when it does not start with tilde", () => {
      const result = resolveSessionDirectory("/absolute/custom/path");

      expect(result).toBe("/absolute/custom/path");
    });

    it("should handle other Unix platforms (e.g., freebsd)", () => {
      vi.stubGlobal("process", {
        ...process,
        platform: "freebsd",
      });

      const result = resolveSessionDirectory();

      expect(result).toBe(`${homedir()}/.local/share/auq/sessions`);
    });

    it("should handle empty baseDir parameter", () => {
      const result = resolveSessionDirectory("");

      // Should treat empty string as falsy and use default XDG path
      expect(result).toContain(homedir());
      expect(result).toContain("auq/sessions");
    });
  });
});
