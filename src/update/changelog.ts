/**
 * GitHub Releases API changelog fetcher.
 *
 * Fetches release notes for a given version from the GitHub Releases API.
 * Handles rate limiting (403/429) gracefully and caches results to reduce API calls.
 * Always returns a fallback URL even when content is unavailable.
 */

import { readCache, writeCache } from "./cache.js";
import type { ChangelogResult } from "./types.js";

const GITHUB_API_URL =
  "https://api.github.com/repos/AlpacaLOS/auq/releases/tags";

/**
 * Fetch changelog content from GitHub Releases API for a specific version.
 *
 * Uses cached changelog if available for the requested version.
 * Gracefully handles rate limits (HTTP 403/429) by returning null content
 * with a fallback URL to the GitHub release page.
 *
 * @param version - The version to fetch changelog for (e.g., "2.5.0")
 * @returns Changelog content and fallback URL
 */
export async function fetchChangelog(
  version: string,
): Promise<ChangelogResult> {
  const fallbackUrl = `https://github.com/AlpacaLOS/auq/releases/tag/v${version}`;

  try {
    // Check cache first to avoid unnecessary API calls
    const cache = await readCache();
    if (
      cache?.changelog &&
      cache?.changelogFetchedAt &&
      cache.latestVersion === version
    ) {
      return { content: cache.changelog, fallbackUrl };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${GITHUB_API_URL}/v${version}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "auq-mcp-server",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // Handle rate limiting — return fallback without content
    if (response.status === 403 || response.status === 429) {
      return { content: null, fallbackUrl };
    }
    if (!response.ok) {
      return { content: null, fallbackUrl };
    }

    const release = (await response.json()) as { body?: string };
    const content = release.body || null;

    // Cache the changelog alongside existing cache data
    if (content && cache) {
      await writeCache({
        ...cache,
        changelog: content,
        changelogFetchedAt: Date.now(),
      }).catch(() => {});
    }

    return { content, fallbackUrl };
  } catch {
    // Network errors, timeouts, parse errors — return fallback
    return { content: null, fallbackUrl };
  }
}