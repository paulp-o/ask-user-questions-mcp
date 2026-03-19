/**
 * Update installation executor.
 *
 * Spawns the detected package manager to install the latest version.
 * Uses node:child_process for portability across Bun and Node.js runtimes.
 */

import { spawn } from "node:child_process";

import type { PackageManagerInfo } from "./types.js";

const PACKAGE_NAME = "auq-mcp-server";

/**
 * Install the latest version of the package using the detected package manager.
 *
 * Spawns the package manager's global install command as a child process.
 * Returns true on success (exit code 0), false on any failure.
 * Never rejects — all errors are caught and resolved as false.
 *
 * @param packageManager - Detected package manager info with install command
 * @returns Whether the installation succeeded
 */
export async function installUpdate(
  packageManager: PackageManagerInfo,
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const [command, ...baseArgs] = packageManager.installCommand.split(" ");
      const args = [...baseArgs, PACKAGE_NAME];

      const child = spawn(command!, args, {
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32",
      });

      child.on("error", () => {
        resolve(false);
      });

      child.on("close", (code: number | null) => {
        resolve(code === 0);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Get the manual install command string for display to the user.
 *
 * Used as a fallback when automatic installation fails, allowing
 * the user to copy and run the command manually.
 *
 * @param packageManager - Detected package manager info
 * @returns Full install command string (e.g., "npm install -g auq-mcp-server")
 */
export function getManualCommand(packageManager: PackageManagerInfo): string {
  return `${packageManager.installCommand} ${PACKAGE_NAME}`;
}