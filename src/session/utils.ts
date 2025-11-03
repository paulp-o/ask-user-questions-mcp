/**
 * Utility functions for session management
 */

import { constants, existsSync } from "fs";
import { promises as fs } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Create a safe filename from a session ID (basic validation)
 */
export function createSafeFilename(
  sessionId: string,
  filename: string,
): string {
  if (!sanitizeSessionId(sessionId)) {
    throw new Error(`Invalid session ID format: ${sessionId}`);
  }
  return filename;
}

/**
 * Ensure a directory exists with proper permissions
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath, constants.W_OK);
  } catch {
    await fs.mkdir(dirPath, { mode: 0o700, recursive: true });
  }
}

/**
 * Check if a file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if a timestamp is older than the specified timeout in milliseconds
 */
export function isTimestampExpired(
  timestamp: string,
  timeoutMs: number,
): boolean {
  const now = new Date().getTime();
  const timestampTime = new Date(timestamp).getTime();
  return now - timestampTime > timeoutMs;
}

/**
 * Resolve session directory path using XDG Base Directory specification
 * Falls back to user home directory if XDG is not available
 */
export function resolveSessionDirectory(baseDir?: string): string {
  if (baseDir) {
    // If baseDir is provided, expand any ~ to home directory
    if (baseDir.startsWith("~")) {
      return join(homedir(), baseDir.slice(1));
    }
    return baseDir;
  }

  // Default XDG-compliant paths
  const home = homedir();
  const platform = process.platform;

  if (platform === "darwin") {
    // macOS: ~/Library/Application Support/
    return join(home, "Library", "Application Support", "auq", "sessions");
  } else if (platform === "win32") {
    // Windows: %APPDATA%/auq/sessions/
    const appData = process.env.APPDATA;
    if (appData) {
      return join(appData, "auq", "sessions");
    }
    // Fallback to user profile
    const userProfile = process.env.USERPROFILE || home;
    return join(userProfile, "auq", "sessions");
  } else {
    // Linux/Unix: ~/.local/share/ (XDG Base Directory)
    // Check for XDG_DATA_HOME environment variable
    const xdgDataHome = process.env.XDG_DATA_HOME;
    if (xdgDataHome) {
      return join(xdgDataHome, "auq", "sessions");
    }
    // Fallback to ~/.local/share/
    return join(home, ".local", "share", "auq", "sessions");
  }
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Validate that a session ID follows UUID v4 format
 */
export function sanitizeSessionId(sessionId: string): boolean {
  // Basic validation - UUID v4 format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
}

/**
 * Validate that a session directory exists and is accessible
 */
export async function validateSessionDirectory(
  baseDir: string,
): Promise<boolean> {
  try {
    await fs.access(baseDir, constants.R_OK | constants.W_OK);
    const stat = await fs.stat(baseDir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Detect whether AUQ is installed globally or locally
 * by inspecting the module's location
 */
export function detectInstallMode(): {
  mode: "global" | "local";
  projectRoot?: string;
} {
  try {
    // Get current module's file path
    const __filename = fileURLToPath(import.meta.url);
    const parts = __filename.split(/[/\\]/); // Handle both Unix and Windows separators

    // Find the last occurrence of 'node_modules' in the path
    const nodeModulesIndex = parts.lastIndexOf("node_modules");

    if (nodeModulesIndex === -1) {
      // Not in node_modules (development or global install without node_modules in path)
      return { mode: "global" };
    }

    // We're inside node_modules - check if there's a project package.json above
    const potentialProjectRoot = parts.slice(0, nodeModulesIndex).join("/");
    const packageJsonPath = join(potentialProjectRoot, "package.json");

    if (existsSync(packageJsonPath)) {
      // Found a package.json above node_modules → local install
      return { mode: "local", projectRoot: potentialProjectRoot };
    }

    // In node_modules but no project context → global install
    return { mode: "global" };
  } catch (error) {
    // Fallback to global mode if detection fails
    console.error("[AUQ] Failed to detect install mode:", error);
    return { mode: "global" };
  }
}

/**
 * Get the appropriate session directory based on installation mode
 * Supports environment variable override via AUQ_SESSION_DIR
 */
export function getSessionDirectory(): string {
  // Check for environment variable override first
  if (process.env.AUQ_SESSION_DIR) {
    const envDir = process.env.AUQ_SESSION_DIR;
    // Expand ~ to home directory if needed
    if (envDir.startsWith("~")) {
      return join(homedir(), envDir.slice(1));
    }
    return envDir;
  }

  // Auto-detect installation mode
  const { mode, projectRoot } = detectInstallMode();

  if (mode === "local" && projectRoot) {
    // Local install: use project-relative .auq/sessions directory
    return join(projectRoot, ".auq", "sessions");
  }

  // Global install: use XDG-compliant system paths
  return resolveSessionDirectory();
}
