/**
 * Auto-update module for AUQ.
 *
 * Provides update checking against the npm registry, version comparison,
 * XDG-compliant cache management, package manager detection, changelog
 * fetching from GitHub Releases, and update installation.
 *
 * @module update
 */
export { UpdateChecker } from "./checker.js";
export { fetchChangelog } from "./changelog.js";
export {
  readCache,
  writeCache,
  clearUpdateCache,
  isCacheFresh,
  shouldSkipVersion,
  getCachePath,
  CACHE_TTL,
} from "./cache.js";
export { installUpdate, getManualCommand } from "./installer.js";
export { detectPackageManager, PACKAGE_NAME } from "./package-manager.js";
export {
  parseVersion,
  isNewer,
  getUpdateType,
  getCurrentVersion,
} from "./version.js";
export type {
  ChangelogResult,
  PackageManagerInfo,
  UpdateCheckCache,
  UpdateInfo,
} from "./types.js";