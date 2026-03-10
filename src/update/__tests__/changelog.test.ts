import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the cache module before importing changelog
vi.mock("../cache.js", () => ({
  readCache: vi.fn(),
  writeCache: vi.fn(),
}));

import { readCache, writeCache } from "../cache.js";
import { fetchChangelog } from "../changelog.js";

describe("changelog fetcher", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: no cache
    vi.mocked(readCache).mockResolvedValue(null);
    vi.mocked(writeCache).mockResolvedValue(undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("should return content and fallbackUrl on successful fetch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ body: "## Changes\n- Fix bug" }),
    });

    const result = await fetchChangelog("2.5.0");

    expect(result.content).toBe("## Changes\n- Fix bug");
    expect(result.fallbackUrl).toBe(
      "https://github.com/AlpacaLOS/auq/releases/tag/v2.5.0",
    );
  });

  it("should return cached changelog without fetching", async () => {
    vi.mocked(readCache).mockResolvedValue({
      lastCheck: Date.now(),
      latestVersion: "2.5.0",
      changelog: "## Cached changelog",
      changelogFetchedAt: Date.now(),
    });

    globalThis.fetch = vi.fn();

    const result = await fetchChangelog("2.5.0");

    expect(result.content).toBe("## Cached changelog");
    expect(result.fallbackUrl).toBe(
      "https://github.com/AlpacaLOS/auq/releases/tag/v2.5.0",
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("should return null content on 403 rate limit", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });

    const result = await fetchChangelog("2.5.0");

    expect(result.content).toBeNull();
    expect(result.fallbackUrl).toBe(
      "https://github.com/AlpacaLOS/auq/releases/tag/v2.5.0",
    );
  });

  it("should return null content on 429 rate limit", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    });

    const result = await fetchChangelog("2.5.0");

    expect(result.content).toBeNull();
    expect(result.fallbackUrl).toBe(
      "https://github.com/AlpacaLOS/auq/releases/tag/v2.5.0",
    );
  });

  it("should return null content on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const result = await fetchChangelog("2.5.0");

    expect(result.content).toBeNull();
    expect(result.fallbackUrl).toBe(
      "https://github.com/AlpacaLOS/auq/releases/tag/v2.5.0",
    );
  });

  it("should return null content on non-OK response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await fetchChangelog("2.5.0");

    expect(result.content).toBeNull();
    expect(result.fallbackUrl).toBe(
      "https://github.com/AlpacaLOS/auq/releases/tag/v2.5.0",
    );
  });

  it("should always have correct fallbackUrl format", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ body: "content" }),
    });

    const result = await fetchChangelog("3.1.0");

    expect(result.fallbackUrl).toBe(
      "https://github.com/AlpacaLOS/auq/releases/tag/v3.1.0",
    );
  });
});