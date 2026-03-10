/**
 * Cache management for update check results.
 *
 * Stores update check data in ~/.config/auq/update-check.json (XDG-compliant).
 * Provides cache freshness checking and skip-version tracking.
 */

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { UpdateCheckCache } from "./types.js";

/** Cache time-to-live: 1 hour in milliseconds */
export const CACHE_TTL = 3600000;

/**
 * Resolve the cache file path using XDG-compliant directory.
 * Respects $XDG_CONFIG_HOME if set, otherwise uses ~/.config.
 */
export function getCachePath(): string {
  const xdgConfigHome =
    process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(xdgConfigHome, "auq", "update-check.json");
}

/**
 * Read and parse the cached update check data.
 * Returns null if the cache file is missing, unreadable, or contains invalid JSON.
 */
export async function readCache(): Promise<UpdateCheckCache | null> {
  try {
    const cachePath = getCachePath();
    const content = await readFile(cachePath, "utf-8");
    return JSON.parse(content) as UpdateCheckCache;
  } catch {
    return null;
  }
}

/**
 * Write update check data to the cache file.
 * Creates the parent directory if it doesn't exist.
 * Silently handles write errors.
 */
export async function writeCache(cache: UpdateCheckCache): Promise<void> {
  try {
    const cachePath = getCachePath();
    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(cachePath, JSON.stringify(cache, null, 2), "utf-8");
  } catch {
    // Silently handle write errors
  }
}

/**
 * Check if the cache is still fresh (within the TTL window).
 * Returns true if lastCheck is within the last hour.
 */
export function isCacheFresh(cache: UpdateCheckCache): boolean {
  return Date.now() - cache.lastCheck < CACHE_TTL;
}

/**
 * Check if the user has chosen to skip the given version.
 */
export function shouldSkipVersion(
  cache: UpdateCheckCache,
  version: string,
): boolean {
  return cache.skippedVersion === version;
}

/**
 * Delete the cache file to force a fresh update check.
 * Silently handles errors if the file doesn't exist or can't be deleted.
 */
export async function clearUpdateCache(): Promise<void> {
  try {
    const cachePath = getCachePath();
    await unlink(cachePath);
  } catch {
    // Silently handle deletion errors
  }
}