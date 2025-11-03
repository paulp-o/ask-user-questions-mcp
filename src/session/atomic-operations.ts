/**
 * Atomic file operations for session management
 * Provides truly atomic read/write operations to prevent data corruption
 */

import { constants, copyFile, rename } from "fs";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { fileExists } from "./utils.js";

export interface AtomicReadOptions {
  encoding?: BufferEncoding;
  flag?: string;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Configuration for atomic operations
 */
export interface AtomicWriteOptions {
  encoding?: BufferEncoding;
  flag?: string;
  maxRetries?: number;
  mode?: number;
  retryDelay?: number;
  tmpDir?: string;
}

/**
 * Error types for atomic operations
 */
export class AtomicOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: "read" | "write",
    public readonly filePath: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "AtomicOperationError";
  }
}

export class AtomicReadError extends AtomicOperationError {
  constructor(filePath: string, cause?: Error) {
    super(`Atomic read failed: ${filePath}`, "read", filePath, cause);
    this.name = "AtomicReadError";
  }
}

export class AtomicWriteError extends AtomicOperationError {
  constructor(filePath: string, cause?: Error) {
    super(`Atomic write failed: ${filePath}`, "write", filePath, cause);
    this.name = "AtomicWriteError";
  }
}

export class FileLockError extends AtomicOperationError {
  constructor(filePath: string, cause?: Error) {
    super(`Failed to acquire file lock: ${filePath}`, "write", filePath, cause);
    this.name = "FileLockError";
  }
}

const DEFAULT_WRITE_OPTIONS: Required<AtomicWriteOptions> = {
  encoding: "utf8",
  flag: "w",
  maxRetries: 3,
  mode: 0o600,
  retryDelay: 100,
  tmpDir: tmpdir(),
};

const DEFAULT_READ_OPTIONS: Required<AtomicReadOptions> = {
  encoding: "utf8",
  flag: "r",
  maxRetries: 3,
  retryDelay: 100,
};

/**
 * Atomic file copy operation
 */
export async function atomicCopyFile(
  sourcePath: string,
  destPath: string,
  options: AtomicWriteOptions = {},
): Promise<void> {
  const opts = { ...DEFAULT_WRITE_OPTIONS, ...options };

  try {
    // Acquire destination lock
    await acquireLock(destPath);

    // Perform atomic copy
    await new Promise<void>((resolve, reject) => {
      copyFile(sourcePath, destPath, constants.COPYFILE_EXCL, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    // Set correct permissions on destination
    await fs.chmod(destPath, opts.mode);
  } catch (error) {
    throw new AtomicOperationError(
      `Atomic copy failed: ${sourcePath} -> ${destPath}`,
      "write",
      destPath,
      error as Error,
    );
  } finally {
    await releaseLock(destPath);
  }
}

/**
 * Atomic file delete operation
 */
export async function atomicDeleteFile(filePath: string): Promise<void> {
  try {
    await acquireLock(filePath);
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File doesn't exist, that's okay for delete
      return;
    }
    throw new AtomicOperationError(
      `Atomic delete failed: ${filePath}`,
      "write",
      filePath,
      error as Error,
    );
  } finally {
    await releaseLock(filePath);
  }
}

/**
 * Atomic read operation with retry logic
 */
export async function atomicReadFile(
  filePath: string,
  options: AtomicReadOptions = {},
): Promise<string> {
  const opts = { ...DEFAULT_READ_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      // Check if file exists
      if (!(await fileExists(filePath))) {
        // File doesn't exist - this is not an error for read operations
        // Return empty string to indicate file doesn't exist
        return "";
      }

      // Acquire read lock (shared lock)
      await acquireLock(filePath);

      try {
        const data = await fs.readFile(filePath, {
          encoding: opts.encoding,
          flag: opts.flag,
        });

        return data;
      } finally {
        await releaseLock(filePath);
      }
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (
        error instanceof AtomicReadError ||
        (error as NodeJS.ErrnoException).code === "ENOENT" ||
        (error as NodeJS.ErrnoException).code === "EACCES"
      ) {
        break;
      }

      // Wait before retrying
      if (attempt < opts.maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, opts.retryDelay * Math.pow(2, attempt)),
        );
      }
    }
  }

  throw new AtomicReadError(filePath, lastError || new Error("Unknown error"));
}

/**
 * Atomic write operation using temporary file and rename
 */
export async function atomicWriteFile(
  filePath: string,
  data: string,
  options: AtomicWriteOptions = {},
): Promise<void> {
  const opts = { ...DEFAULT_WRITE_OPTIONS, ...options };
  const tempPath = generateTempPath(filePath, opts.tmpDir);

  try {
    // Acquire file lock
    await acquireLock(filePath);

    // Write to temporary file first
    await fs.writeFile(tempPath, data, {
      encoding: opts.encoding,
      flag: opts.flag,
      mode: opts.mode,
    });

    // Verify the temporary file was written correctly
    const verificationData = await fs.readFile(tempPath, opts.encoding);
    if (verificationData !== data) {
      throw new AtomicWriteError(
        filePath,
        new Error("Data verification failed after write"),
      );
    }

    // Atomic rename operation
    await new Promise<void>((resolve, reject) => {
      rename(tempPath, filePath, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    // Verify the final file exists and has correct permissions
    try {
      await fs.access(filePath, constants.F_OK);
      const stats = await fs.stat(filePath);
      // Check if mode is correct (at least read/write for owner)
      if ((stats.mode & 0o600) !== 0o600) {
        await fs.chmod(filePath, opts.mode);
      }
    } catch (error) {
      throw new AtomicWriteError(
        filePath,
        new Error(`File verification failed after rename: ${error}`),
      );
    }
  } catch (error) {
    // Clean up temporary file on failure
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw new AtomicWriteError(filePath, error as Error);
  } finally {
    // Always release the lock
    await releaseLock(filePath);
  }
}

/**
 * Check if a file is locked
 */
export async function isFileLocked(filePath: string): Promise<boolean> {
  const lockPath = `${filePath}.lock`;
  return await fileExists(lockPath);
}

/**
 * Wait for a file to become unlocked (with timeout)
 */
export async function waitForFileUnlock(
  filePath: string,
  timeout = 10000,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (!(await isFileLocked(filePath))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new FileLockError(
    filePath,
    new Error("Timeout waiting for file unlock"),
  );
}

/**
 * Simple file lock implementation using lock files
 */
async function acquireLock(filePath: string, timeout = 5000): Promise<void> {
  const lockPath = `${filePath}.lock`;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      // Try to create lock file (O_EXCL ensures atomic creation)
      await fs.writeFile(lockPath, process.pid.toString(), {
        encoding: "utf8",
        flag: "wx", // Write and fail if file exists
        mode: 0o600,
      });
      return; // Lock acquired
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        // Lock file exists, check if it's stale
        try {
          const lockContent = await fs.readFile(lockPath, "utf8");
          const lockPid = parseInt(lockContent.trim(), 10);

          // Check if process with PID still exists
          try {
            process.kill(lockPid, 0); // Signal 0 just checks if process exists
          } catch {
            // Process doesn't exist, remove stale lock
            await fs.unlink(lockPath);
            continue;
          }
        } catch {
          // Can't read lock file, try to remove it
          try {
            await fs.unlink(lockPath);
            continue;
          } catch {
            // Can't remove lock file, continue waiting
          }
        }

        // Lock is active, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }
      throw error; // Other error occurred
    }
  }

  throw new FileLockError(filePath, new Error("Lock acquisition timeout"));
}

/**
 * Get the base filename from a path
 */
function basename(path: string): string {
  return path.split(/[\\/]/).pop() || "";
}

/**
 * Generate a unique temporary file path
 */
function generateTempPath(originalPath: string, tmpDir: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const filename = `${timestamp}-${random}-${basename(originalPath)}.tmp`;
  return join(tmpDir, filename);
}

/**
 * Release a file lock
 */
async function releaseLock(filePath: string): Promise<void> {
  const lockPath = `${filePath}.lock`;
  try {
    await fs.unlink(lockPath);
  } catch (error) {
    // Lock file might not exist or we don't have permission
    // Don't throw error as this is cleanup
    // Only log if it's not ENOENT (file not found)
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Warning: Could not release lock for ${filePath}:`, error);
    }
  }
}
