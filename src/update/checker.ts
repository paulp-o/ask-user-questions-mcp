/**
 * Core update checker orchestrator.
 *
 * Uses a memoized promise pattern to deduplicate concurrent update checks.
 * Reads cached data first, falls back to npm registry fetch with a 5-second
 * timeout. Silently returns null on any error — update checks must never
 * break the application.
 */

import { isNewer, getUpdateType, getCurrentVersion } from "./version.js";
import {
  readCache,
  writeCache,
  isCacheFresh,
  shouldSkipVersion,
  clearUpdateCache,
} from "./cache.js";
import type { UpdateCheckCache, UpdateInfo } from "./types.js";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/auq-mcp-server";
const GITHUB_RELEASES_URL = "https://github.com/AlpacaLOS/auq/releases/tag";

export class UpdateChecker {
  private checkPromise: Promise<UpdateInfo | null> | null = null;
  private currentVersion: string;

  constructor(currentVersion?: string) {
    this.currentVersion = currentVersion || getCurrentVersion();
  }

  /**
   * Check for available updates.
   *
   * Uses a memoized promise to prevent duplicate concurrent requests.
   * Returns null if the check should be skipped (CI, env vars, etc.),
   * if no update is available, or if any error occurs.
   */
  async check(): Promise<UpdateInfo | null> {
    if (this.shouldSkipCheck()) return null;
    if (this.checkPromise) return this.checkPromise;
    this.checkPromise = this.performCheck();
    return this.checkPromise;
  }

  /**
   * Determine if the update check should be skipped entirely.
   *
   * Skips in CI environments, when NO_UPDATE_NOTIFIER is set,
   * or when NODE_ENV is "test".
   */
  shouldSkipCheck(): boolean {
    // CI environments
    if (process.env.CI === "true" || process.env.CI === "1") return true;
    // Explicit opt-out via NO_UPDATE_NOTIFIER
    if (
      process.env.NO_UPDATE_NOTIFIER === "1" ||
      process.env.NO_UPDATE_NOTIFIER === "true"
    )
      return true;
    // Test environment
    if (process.env.NODE_ENV === "test") return true;
    return false;
  }

  /**
   * Perform the actual update check.
   *
   * 1. Read cache — if fresh, use cached version info.
   * 2. Fetch npm registry with 5s timeout for latest dist-tag.
   * 3. Write updated cache (preserving skippedVersion and changelog).
   * 4. Compare versions and return UpdateInfo or null.
   */
  private async performCheck(): Promise<UpdateInfo | null> {
    try {
      // 1. Check cache first
      const cache = await readCache();
      if (cache && isCacheFresh(cache)) {
        if (!isNewer(this.currentVersion, cache.latestVersion)) return null;
        if (shouldSkipVersion(cache, cache.latestVersion)) return null;
        return {
          currentVersion: this.currentVersion,
          latestVersion: cache.latestVersion,
          updateType: getUpdateType(this.currentVersion, cache.latestVersion),
          changelogUrl: `${GITHUB_RELEASES_URL}/v${cache.latestVersion}`,
        };
      }

      // 2. Fetch from npm registry
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(NPM_REGISTRY_URL, {
        headers: { Accept: "application/vnd.npm.install-v1+json" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) return null;

      const data = (await response.json()) as {
        "dist-tags"?: { latest?: string };
      };
      const latestVersion = data["dist-tags"]?.latest;
      if (!latestVersion) return null;

      // 3. Write cache (preserve skippedVersion and changelog from old cache)
      const newCache: UpdateCheckCache = {
        lastCheck: Date.now(),
        latestVersion,
        skippedVersion: cache?.skippedVersion,
        changelog: cache?.changelog,
        changelogFetchedAt: cache?.changelogFetchedAt,
      };
      await writeCache(newCache).catch(() => {});

      // 4. Compare versions
      if (!isNewer(this.currentVersion, latestVersion)) return null;
      if (cache && shouldSkipVersion(cache, latestVersion)) return null;

      return {
        currentVersion: this.currentVersion,
        latestVersion,
        updateType: getUpdateType(this.currentVersion, latestVersion),
        changelogUrl: `${GITHUB_RELEASES_URL}/v${latestVersion}`,
      };
    } catch {
      return null;
    }
  }

  /** Reset the memoized promise and clear the on-disk cache. */
  clearCache(): void {
    this.checkPromise = null;
    clearUpdateCache().catch(() => {});
  }
}