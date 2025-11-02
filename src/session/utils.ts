/**
 * Utility functions for session management
 */

import { constants } from "fs";
import { promises as fs } from "fs";

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
