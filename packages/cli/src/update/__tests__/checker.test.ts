import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("../cache.js", () => ({
  readCache: vi.fn(),
  writeCache: vi.fn(),
  isCacheFresh: vi.fn(),
  shouldSkipVersion: vi.fn(),
  clearUpdateCache: vi.fn(),
}));

vi.mock("../version.js", () => ({
  isNewer: vi.fn(),
  getUpdateType: vi.fn(),
  getCurrentVersion: vi.fn(() => "1.0.0"),
}));

import {
  readCache,
  writeCache,
  isCacheFresh,
  shouldSkipVersion,
  clearUpdateCache,
} from "../cache.js";
import { isNewer, getUpdateType, getCurrentVersion } from "../version.js";
import { UpdateChecker } from "../checker.js";

describe("UpdateChecker", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear env vars that trigger shouldSkipCheck
    delete process.env.CI;
    delete process.env.NO_UPDATE_NOTIFIER;
    delete process.env.NODE_ENV;

    // Default mocks
    vi.mocked(readCache).mockResolvedValue(null);
    vi.mocked(writeCache).mockResolvedValue(undefined);
    vi.mocked(clearUpdateCache).mockResolvedValue(undefined);
    vi.mocked(isCacheFresh).mockReturnValue(false);
    vi.mocked(shouldSkipVersion).mockReturnValue(false);
    vi.mocked(isNewer).mockReturnValue(false);
    vi.mocked(getUpdateType).mockReturnValue("patch");
    vi.mocked(getCurrentVersion).mockReturnValue("1.0.0");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("shouldSkipCheck", () => {
    it("should return true when CI=true", () => {
      process.env.CI = "true";
      const checker = new UpdateChecker("1.0.0");
      expect(checker.shouldSkipCheck()).toBe(true);
    });

    it("should return true when NO_UPDATE_NOTIFIER=1", () => {
      process.env.NO_UPDATE_NOTIFIER = "1";
      const checker = new UpdateChecker("1.0.0");
      expect(checker.shouldSkipCheck()).toBe(true);
    });

    it("should return true when NODE_ENV=test", () => {
      process.env.NODE_ENV = "test";
      const checker = new UpdateChecker("1.0.0");
      expect(checker.shouldSkipCheck()).toBe(true);
    });

    it("should return false when none of the skip conditions are set", () => {
      const checker = new UpdateChecker("1.0.0");
      expect(checker.shouldSkipCheck()).toBe(false);
    });
  });

  describe("check", () => {
    it("should return null when shouldSkipCheck is true", async () => {
      process.env.CI = "true";
      const checker = new UpdateChecker("1.0.0");
      const result = await checker.check();
      expect(result).toBeNull();
    });

    it("should return UpdateInfo when a newer version is available", async () => {
      // Ensure shouldSkipCheck returns false
      process.env.NODE_ENV = "development";
      vi.mocked(isNewer).mockReturnValue(true);
      vi.mocked(getUpdateType).mockReturnValue("minor");

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ "dist-tags": { latest: "1.1.0" } }),
      });

      const checker = new UpdateChecker("1.0.0");
      const result = await checker.check();

      expect(result).not.toBeNull();
      expect(result?.currentVersion).toBe("1.0.0");
      expect(result?.latestVersion).toBe("1.1.0");
      expect(result?.updateType).toBe("minor");
      expect(result?.changelogUrl).toContain("v1.1.0");
    });

    it("should return null when versions are the same", async () => {
      // Ensure shouldSkipCheck returns false
      process.env.NODE_ENV = "development";
      vi.mocked(isNewer).mockReturnValue(false);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ "dist-tags": { latest: "1.0.0" } }),
      });

      const checker = new UpdateChecker("1.0.0");
      const result = await checker.check();

      expect(result).toBeNull();
    });

    it("should return null on fetch error", async () => {
      // Ensure shouldSkipCheck returns false
      process.env.NODE_ENV = "development";
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error"));

      const checker = new UpdateChecker("1.0.0");
      const result = await checker.check();

      expect(result).toBeNull();
    });

    it("should memoize: two check() calls only fetch once", async () => {
      // Ensure shouldSkipCheck returns false
      process.env.NODE_ENV = "development";
      vi.mocked(isNewer).mockReturnValue(true);
      vi.mocked(getUpdateType).mockReturnValue("patch");

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ "dist-tags": { latest: "1.0.1" } }),
      });

      const checker = new UpdateChecker("1.0.0");
      const [result1, result2] = await Promise.all([
        checker.check(),
        checker.check(),
      ]);

      // Both should resolve to the same value
      expect(result1).toStrictEqual(result2);
      // Fetch should have been called only once (memoized)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("clearCache", () => {
    it("should reset the memoized promise", async () => {
      // Ensure shouldSkipCheck returns false
      process.env.NODE_ENV = "development";
      vi.mocked(isNewer).mockReturnValue(true);
      vi.mocked(getUpdateType).mockReturnValue("patch");

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ "dist-tags": { latest: "1.0.1" } }),
      });

      const checker = new UpdateChecker("1.0.0");

      // First check
      const result1 = await checker.check();
      expect(result1).not.toBeNull();

      // Clear cache
      checker.clearCache();

      // Second check should create a new promise (calls fetch again)
      const result2 = await checker.check();
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });
});