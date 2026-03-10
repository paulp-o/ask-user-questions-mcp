import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UpdateCheckCache } from "../types.js";

// Mock node:fs/promises and node:os before importing the module under test
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { homedir } from "node:os";

import {
  getCachePath,
  readCache,
  writeCache,
  isCacheFresh,
  shouldSkipVersion,
  clearUpdateCache,
  CACHE_TTL,
} from "../cache.js";

describe("cache management", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.XDG_CONFIG_HOME;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("CACHE_TTL", () => {
    it("should be 1 hour in milliseconds", () => {
      expect(CACHE_TTL).toBe(3600000);
    });
  });

  describe("getCachePath", () => {
    it("should use homedir/.config when XDG_CONFIG_HOME is not set", () => {
      const path = getCachePath();
      expect(path).toContain("/home/testuser/.config/auq/update-check.json");
    });

    it("should use XDG_CONFIG_HOME when set", () => {
      process.env.XDG_CONFIG_HOME = "/custom/config";
      const path = getCachePath();
      expect(path).toContain("/custom/config/auq/update-check.json");
    });
  });

  describe("readCache", () => {
    it("should return parsed cache when file contains valid JSON", async () => {
      const cache: UpdateCheckCache = {
        lastCheck: Date.now(),
        latestVersion: "2.5.0",
      };
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(cache));

      const result = await readCache();
      expect(result).toEqual(cache);
    });

    it("should return null when file is missing", async () => {
      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));

      const result = await readCache();
      expect(result).toBeNull();
    });

    it("should return null when file contains invalid JSON", async () => {
      vi.mocked(readFile).mockResolvedValue("not valid json{{{");

      const result = await readCache();
      expect(result).toBeNull();
    });
  });

  describe("writeCache", () => {
    it("should create directory and write JSON", async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const cache: UpdateCheckCache = {
        lastCheck: Date.now(),
        latestVersion: "2.5.0",
      };

      await writeCache(cache);

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining("auq"),
        { recursive: true },
      );
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining("update-check.json"),
        JSON.stringify(cache, null, 2),
        "utf-8",
      );
    });

    it("should silently handle write errors", async () => {
      vi.mocked(mkdir).mockRejectedValue(new Error("EACCES"));

      const cache: UpdateCheckCache = {
        lastCheck: Date.now(),
        latestVersion: "2.5.0",
      };

      // Should not throw
      await expect(writeCache(cache)).resolves.toBeUndefined();
    });
  });

  describe("isCacheFresh", () => {
    it("should return true for a recent cache (30 min ago)", () => {
      const cache: UpdateCheckCache = {
        lastCheck: Date.now() - 30 * 60 * 1000, // 30 minutes ago
        latestVersion: "2.5.0",
      };
      expect(isCacheFresh(cache)).toBe(true);
    });

    it("should return false for an old cache (2 hours ago)", () => {
      const cache: UpdateCheckCache = {
        lastCheck: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        latestVersion: "2.5.0",
      };
      expect(isCacheFresh(cache)).toBe(false);
    });
  });

  describe("shouldSkipVersion", () => {
    it("should return true when skippedVersion matches", () => {
      const cache: UpdateCheckCache = {
        lastCheck: Date.now(),
        latestVersion: "2.5.0",
        skippedVersion: "2.5.0",
      };
      expect(shouldSkipVersion(cache, "2.5.0")).toBe(true);
    });

    it("should return false when skippedVersion does not match", () => {
      const cache: UpdateCheckCache = {
        lastCheck: Date.now(),
        latestVersion: "2.5.0",
        skippedVersion: "2.4.0",
      };
      expect(shouldSkipVersion(cache, "2.5.0")).toBe(false);
    });

    it("should return false when skippedVersion is undefined", () => {
      const cache: UpdateCheckCache = {
        lastCheck: Date.now(),
        latestVersion: "2.5.0",
      };
      expect(shouldSkipVersion(cache, "2.5.0")).toBe(false);
    });
  });

  describe("clearUpdateCache", () => {
    it("should call unlink on the cache file", async () => {
      vi.mocked(unlink).mockResolvedValue(undefined);

      await clearUpdateCache();

      expect(unlink).toHaveBeenCalledWith(
        expect.stringContaining("update-check.json"),
      );
    });

    it("should silently handle errors when file does not exist", async () => {
      vi.mocked(unlink).mockRejectedValue(new Error("ENOENT"));

      await expect(clearUpdateCache()).resolves.toBeUndefined();
    });
  });
});