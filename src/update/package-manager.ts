/**
 * Package manager detection for the auto-update system.
 *
 * Detects which package manager was used to install AUQ by inspecting
 * environment variables and process paths, following a priority-based
 * detection strategy.
 */

import type { PackageManagerInfo } from "./types.js";

/** The npm package name used for global install/update commands. */
export const PACKAGE_NAME = "auq-mcp-server";

/**
 * Detects which package manager was used to install AUQ.
 *
 * Detection priority:
 *   1. `process.env.npm_config_user_agent` — most reliable for npm/yarn/pnpm
 *   2. `process.env.npm_execpath` — fallback for npm-based managers
 *   3. `process.execPath` — check if executable path contains package manager names
 *   4. Default to npm as universal fallback
 *
 * @returns Package manager info with name and global install command prefix.
 *          The install command does NOT include the package name — the caller appends it.
 */
export function detectPackageManager(): PackageManagerInfo {
  // Priority 1: npm_config_user_agent (most reliable)
  // Format is typically: "npm/10.2.0 node/v20.9.0 darwin arm64"
  const userAgent = process.env.npm_config_user_agent || "";
  if (userAgent.includes("bun"))
    return { name: "bun", installCommand: "bun add -g" };
  if (userAgent.includes("yarn"))
    return { name: "yarn", installCommand: "yarn global add" };
  if (userAgent.includes("pnpm"))
    return { name: "pnpm", installCommand: "pnpm add -g" };
  if (userAgent.includes("npm"))
    return { name: "npm", installCommand: "npm install -g" };

  // Priority 2: npm_execpath (path to the package manager executable)
  const execpath = (process.env.npm_execpath || "").toLowerCase();
  if (execpath.includes("bun"))
    return { name: "bun", installCommand: "bun add -g" };
  if (execpath.includes("yarn"))
    return { name: "yarn", installCommand: "yarn global add" };
  if (execpath.includes("pnpm"))
    return { name: "pnpm", installCommand: "pnpm add -g" };

  // Priority 3: process.execPath (runtime executable path)
  // Useful for detecting bun when run outside a package manager context
  const execPath = process.execPath.toLowerCase();
  if (execPath.includes("bun"))
    return { name: "bun", installCommand: "bun add -g" };

  // Priority 4: Default fallback — npm is universally available
  return { name: "npm", installCommand: "npm install -g" };
}