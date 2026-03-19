/**
 * Semver comparison utilities for the auto-update system.
 *
 * Provides version parsing, comparison, and update type detection
 * without requiring external dependencies like the `semver` package.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/** Parsed semantic version components */
interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/**
 * Parse a version string into its numeric components.
 *
 * Strips a leading `v` prefix if present. Splits prerelease
 * identifiers on `-`. Handles two-part versions like "2.5"
 * by treating the missing patch as 0.
 *
 * @param version - Semver string, e.g., "2.5.0", "v1.2.3-beta.1"
 * @returns Parsed version object
 * @throws Error if any numeric component is NaN
 */
export function parseVersion(version: string): ParsedVersion {
  // Strip leading 'v' prefix
  const cleaned = version.startsWith("v") ? version.slice(1) : version;

  // Separate prerelease from numeric parts
  const [numericPart, ...prereleaseParts] = cleaned.split("-");
  const prerelease =
    prereleaseParts.length > 0 ? prereleaseParts.join("-") : undefined;

  const parts = numericPart.split(".");
  const major = Number(parts[0]);
  const minor = Number(parts[1] ?? "0");
  const patch = Number(parts[2] ?? "0");

  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
    throw new Error(`Invalid version string: "${version}"`);
  }

  return { major, minor, patch, prerelease };
}

/**
 * Determine if `latest` is newer than `current`.
 *
 * Compares major, minor, and patch components numerically.
 * For prerelease handling: a version WITH a prerelease tag is
 * considered OLDER than the same version WITHOUT one
 * (e.g., `2.5.0-beta.1 < 2.5.0`).
 *
 * @param current - Currently installed version
 * @param latest - Latest available version
 * @returns true if `latest` is strictly newer than `current`
 */
export function isNewer(current: string, latest: string): boolean {
  const c = parseVersion(current);
  const l = parseVersion(latest);

  // Compare major.minor.patch numerically
  if (l.major !== c.major) return l.major > c.major;
  if (l.minor !== c.minor) return l.minor > c.minor;
  if (l.patch !== c.patch) return l.patch > c.patch;

  // Same numeric version — check prerelease
  // A version with prerelease is older than the same version without
  if (c.prerelease && !l.prerelease) return true;
  if (!c.prerelease && l.prerelease) return false;

  // Both have prerelease or both don't — considered equal
  return false;
}

/**
 * Determine the type of update between two versions.
 *
 * @param current - Currently installed version
 * @param latest - Latest available version
 * @returns "major" | "minor" | "patch"
 */
export function getUpdateType(
  current: string,
  latest: string,
): "patch" | "minor" | "major" {
  const c = parseVersion(current);
  const l = parseVersion(latest);

  if (l.major > c.major) return "major";
  if (l.minor > c.minor) return "minor";
  return "patch";
}

/**
 * Read the current installed version from the package's package.json.
 *
 * Resolves the path relative to this module's location, trying
 * multiple paths to handle both local dev and global install layouts.
 *
 * @returns The current version string
 * @throws Error if package.json cannot be found or parsed
 */
export function getCurrentVersion(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Try different possible paths for package.json
  // - ../../package.json: from src/update/ in local dev (src/update -> src -> root)
  // - ../../../package.json: from dist/update/ in global install (dist/update -> dist -> root)
  const possiblePaths = [
    join(__dirname, "..", "..", "package.json"),
    join(__dirname, "..", "..", "..", "package.json"),
  ];

  for (const path of possiblePaths) {
    try {
      const packageJson = JSON.parse(readFileSync(path, "utf-8"));
      if (packageJson.version) {
        return packageJson.version as string;
      }
    } catch {
      // Try next path
    }
  }

  throw new Error("Could not determine current version from package.json");
}