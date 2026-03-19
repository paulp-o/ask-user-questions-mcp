/**
 * TypeScript type definitions for the auto-update system.
 *
 * These interfaces define the data structures used throughout the update module
 * for version checking, caching, package manager detection, and changelog fetching.
 */

/** Cache structure stored at ~/.config/auq/update-check.json */
export interface UpdateCheckCache {
  /** Unix timestamp in milliseconds of the last update check */
  lastCheck: number;
  /** Latest version available on npm, e.g., "2.5.0" */
  latestVersion: string;
  /** Version the user chose to skip, if any */
  skippedVersion?: string;
  /** Cached changelog markdown content */
  changelog?: string;
  /** Unix timestamp in milliseconds when changelog was fetched */
  changelogFetchedAt?: number;
}

/** Result of an update check comparison */
export interface UpdateInfo {
  /** Currently installed version */
  currentVersion: string;
  /** Latest available version from npm registry */
  latestVersion: string;
  /** Type of update based on semver comparison */
  updateType: "patch" | "minor" | "major";
  /** URL to the changelog/release notes on GitHub */
  changelogUrl: string;
}

/** Detected package manager information */
export interface PackageManagerInfo {
  /** Name of the detected package manager */
  name: "bun" | "npm" | "yarn" | "pnpm";
  /** Global install command prefix, e.g., "bun add -g" */
  installCommand: string;
}

/** Result of fetching a changelog from GitHub Releases API */
export interface ChangelogResult {
  /** Markdown content of the release notes, or null if unavailable */
  content: string | null;
  /** GitHub release URL, always available as fallback */
  fallbackUrl: string;
}