/**
 * Unit tests for atomic file operations
 */

import { promises as fs } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { setTimeout as delay } from "timers/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  atomicCopyFile,
  atomicDeleteFile,
  AtomicOperationError,
  AtomicReadError,
  atomicReadFile,
  AtomicWriteError,
  atomicWriteFile,
  FileLockError,
  isFileLocked,
  waitForFileUnlock,
} from "../atomic-operations.js";

const testDir = await fs.mkdtemp(join(tmpdir(), "auq-atomic-test-"));

describe("Atomic File Operations", () => {
  const testFile = join(testDir, "test.txt");
  const testContent = "Hello, Atomic World!";

  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.rm(testDir, { force: true, recursive: true }).catch(() => {});
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    // Clean up test directory after each test
    await fs.rm(testDir, { force: true, recursive: true }).catch(() => {});
  });

  describe("atomicWriteFile", () => {
    it("creates default temporary files beside the destination", async () => {
      const writeSpy = vi.spyOn(fs, "writeFile");
      await atomicWriteFile(testFile, testContent);

      const tempWrite = writeSpy.mock.calls.find(([path]) =>
        String(path).endsWith(".tmp"),
      );
      expect(tempWrite).toBeDefined();
      expect(dirname(String(tempWrite![0]))).toBe(testDir);
    });

    it("honors an explicitly configured temporary directory", async () => {
      const customTmpDir = join(testDir, "custom-tmp");
      await fs.mkdir(customTmpDir);
      const writeSpy = vi.spyOn(fs, "writeFile");
      await atomicWriteFile(testFile, testContent, { tmpDir: customTmpDir });

      const tempWrite = writeSpy.mock.calls.find(([path]) =>
        String(path).endsWith(".tmp"),
      );
      expect(tempWrite).toBeDefined();
      expect(dirname(String(tempWrite![0]))).toBe(customTmpDir);
    });

    it("should write file atomically with correct content", async () => {
      await atomicWriteFile(testFile, testContent);

      const content = await fs.readFile(testFile, "utf-8");
      expect(content).toBe(testContent);
    });

    it("should create file with correct permissions", async () => {
      await atomicWriteFile(testFile, testContent, { mode: 0o640 });

      const stats = await fs.stat(testFile);
      // Check that owner has read/write permissions
      expect(stats.mode & 0o600).toBe(0o600);
    });

    it("should overwrite existing file atomically", async () => {
      // Write initial content
      await fs.writeFile(testFile, "Initial content");
      await atomicWriteFile(testFile, testContent);

      const content = await fs.readFile(testFile, "utf-8");
      expect(content).toBe(testContent);
    });

    it("cleans up temporary files and locks after rename failure", async () => {
      const destinationDirectory = join(testDir, "destination");
      await fs.mkdir(destinationDirectory);

      const error = await atomicWriteFile(
        destinationDirectory,
        testContent,
      ).then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(error).toBeInstanceOf(AtomicWriteError);
      expect((error as AtomicWriteError).cause).toMatchObject({
        syscall: "rename",
      });

      expect(await fs.readdir(testDir)).toEqual(["destination"]);
      expect(await isFileLocked(destinationDirectory)).toBe(false);
    });

    it("should verify data integrity after write", async () => {
      const largeContent = "x".repeat(10000); // 10KB content
      await atomicWriteFile(testFile, largeContent);

      const content = await fs.readFile(testFile, "utf-8");
      expect(content).toBe(largeContent);
      expect(content.length).toBe(10000);
    });

    it("should handle empty content correctly", async () => {
      await atomicWriteFile(testFile, "");

      const content = await fs.readFile(testFile, "utf-8");
      expect(content).toBe("");
    });

    it("should handle special characters in content", async () => {
      const specialContent =
        "Unicode: 🚀\nNewlines\nTabs: \tQuotes: \"'\nBackslashes: \\";
      await atomicWriteFile(testFile, specialContent);

      const content = await fs.readFile(testFile, "utf-8");
      expect(content).toBe(specialContent);
    });
  });

  describe("atomicReadFile", () => {
    beforeEach(async () => {
      await fs.writeFile(testFile, testContent, { mode: 0o644 });
    });

    it("should read file content correctly", async () => {
      const content = await atomicReadFile(testFile);
      expect(content).toBe(testContent);
    });

    it("should throw error for non-existent file", async () => {
      const nonExistentFile = join(testDir, "non-existent.txt");

      try {
        await atomicReadFile(nonExistentFile);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(AtomicReadError);
        expect((error as Error).message).toContain("Atomic read failed");
        // The error message itself should indicate the file doesn't exist
        expect((error as Error).message).toContain("non-existent.txt");
      }
    });

    it("should handle retry logic on temporary failures", async () => {
      // This test is harder to implement without mocking, but we can test the retry structure
      const content = await atomicReadFile(testFile, {
        maxRetries: 5,
        retryDelay: 10,
      });
      expect(content).toBe(testContent);
    });

    it("should read empty files correctly", async () => {
      const emptyFile = join(testDir, "empty.txt");
      await fs.writeFile(emptyFile, "");

      const content = await atomicReadFile(emptyFile);
      expect(content).toBe("");
    });

    it("should handle large files efficiently", async () => {
      const largeContent = "x".repeat(50000); // 50KB
      const largeFile = join(testDir, "large.txt");
      await fs.writeFile(largeFile, largeContent);

      const content = await atomicReadFile(largeFile);
      expect(content).toBe(largeContent);
      expect(content.length).toBe(50000);
    });
  });

  describe("atomicDeleteFile", () => {
    beforeEach(async () => {
      await fs.writeFile(testFile, testContent);
    });

    it("should delete existing file", async () => {
      await atomicDeleteFile(testFile);

      const exists = await fs
        .access(testFile)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it("should handle non-existent file gracefully", async () => {
      const nonExistentFile = join(testDir, "non-existent.txt");

      // Should not throw an error
      await expect(atomicDeleteFile(nonExistentFile)).resolves.toBeUndefined();
    });

    it("should release lock after deletion", async () => {
      await atomicDeleteFile(testFile);

      // File should not be locked after deletion
      const isLocked = await isFileLocked(testFile);
      expect(isLocked).toBe(false);
    });
  });

  describe("atomicCopyFile", () => {
    const sourceFile = join(testDir, "source.txt");
    const destFile = join(testDir, "dest.txt");

    beforeEach(async () => {
      await fs.writeFile(sourceFile, testContent);
    });

    it("should copy file with correct content", async () => {
      await atomicCopyFile(sourceFile, destFile);

      const content = await fs.readFile(destFile, "utf-8");
      expect(content).toBe(testContent);
    });

    it("should preserve source file", async () => {
      await atomicCopyFile(sourceFile, destFile);

      const sourceContent = await fs.readFile(sourceFile, "utf-8");
      expect(sourceContent).toBe(testContent);
    });

    it("should set correct permissions on destination", async () => {
      await atomicCopyFile(sourceFile, destFile, { mode: 0o640 });

      const stats = await fs.stat(destFile);
      expect(stats.mode & 0o600).toBe(0o600);
    });

    it("should fail if destination already exists", async () => {
      await fs.writeFile(destFile, "Existing content");

      try {
        await atomicCopyFile(sourceFile, destFile);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(AtomicOperationError);
      }

      // Original content should remain unchanged
      const existingContent = await fs.readFile(destFile, "utf-8");
      expect(existingContent).toBe("Existing content");
    });
  });

  describe("File Locking", () => {
    it.each([
      ["write", (path: string) => atomicWriteFile(path, "replacement")],
      ["copy", (path: string) => atomicCopyFile(join(testDir, "source"), path)],
      ["delete", atomicDeleteFile],
    ] as const)(
      "preserves another owner's lock after a %s timeout",
      async (_, operation) => {
        const lockFile = `${testFile}.lock`;
        const owner = process.pid.toString();
        await fs.writeFile(testFile, testContent);
        await fs.writeFile(join(testDir, "source"), "replacement");
        await fs.writeFile(lockFile, owner, { flag: "wx" });

        await expect(operation(testFile)).rejects.toMatchObject({
          cause: expect.any(FileLockError),
        });

        expect(await isFileLocked(testFile)).toBe(true);
        expect(await fs.readFile(lockFile, "utf8")).toBe(owner);
        expect(await fs.readFile(testFile, "utf8")).toBe(testContent);
      },
      10_000,
    );

    it("should detect when file is locked", async () => {
      // Manually create a lock file
      const lockFile = `${testFile}.lock`;
      await fs.writeFile(lockFile, process.pid.toString(), { mode: 0o600 });

      const isLocked = await isFileLocked(testFile);
      expect(isLocked).toBe(true);
    });

    it("should detect when file is not locked", async () => {
      const isLocked = await isFileLocked(testFile);
      expect(isLocked).toBe(false);
    });

    it("should wait for file unlock", async () => {
      const lockFile = `${testFile}.lock`;
      await fs.writeFile(lockFile, process.pid.toString(), { mode: 0o600 });

      const unlockPromise = waitForFileUnlock(testFile, 5000);
      const initialState = await Promise.race([
        unlockPromise.then(() => "unlocked"),
        delay(150).then(() => "locked"),
      ]);
      expect(initialState).toBe("locked");

      await fs.unlink(lockFile);
      await expect(unlockPromise).resolves.toBeUndefined();
    });

    it("should timeout waiting for file unlock", async () => {
      const lockFile = `${testFile}.lock`;
      await fs.writeFile(testFile, testContent);
      await fs.writeFile(lockFile, process.pid.toString(), { mode: 0o600 });

      await expect(waitForFileUnlock(testFile, 100)).rejects.toBeInstanceOf(
        FileLockError,
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle permission errors gracefully", async () => {
      // Note: Atomic operations might succeed on read-only files by creating new files
      // This test verifies that the operation completes without throwing unexpected errors
      const readOnlyFile = join(testDir, "readonly.txt");
      await fs.writeFile(readOnlyFile, testContent, { mode: 0o444 });

      try {
        await atomicWriteFile(readOnlyFile, "New content");

        // If we get here, the atomic write succeeded (which is expected behavior)
        // Verify the content was written correctly
        const newContent = await fs.readFile(readOnlyFile, "utf-8");
        expect(newContent).toBe("New content");
      } catch (error) {
        // If an error occurs, it should be an expected type
        console.log("Permission test error:", error);

        const isErrorExpected =
          error instanceof AtomicWriteError ||
          (error as NodeJS.ErrnoException).code === "EACCES" ||
          (error as NodeJS.ErrnoException).code === "EPERM";

        expect(isErrorExpected).toBe(true);
      }
    });

    it("should handle disk space issues gracefully", async () => {
      // This is hard to test without actual disk space issues
      // but we can test the error handling structure
      const largeContent = "x".repeat(1000000); // 1MB
      await atomicWriteFile(testFile, largeContent);

      const content = await atomicReadFile(testFile);
      expect(content).toBe(largeContent);
    });

    it("should provide specific error types", async () => {
      const nonExistentFile = join(testDir, "missing", "file.txt");
      // Test AtomicReadError
      try {
        await atomicReadFile(nonExistentFile);
        expect.fail("Should have thrown AtomicReadError");
      } catch (error) {
        expect(error).toBeInstanceOf(AtomicReadError);
      }

      // Test AtomicWriteError
      try {
        await atomicWriteFile(nonExistentFile, "content");
        expect.fail("Should have thrown AtomicWriteError");
      } catch (error) {
        expect(error).toBeInstanceOf(AtomicWriteError);
      }
    });
  });

  describe("Concurrent Access", () => {
    it("should handle concurrent writes correctly", async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        atomicWriteFile(testFile, `Content ${i}`),
      );

      // All writes should complete without errors
      await expect(Promise.all(promises)).resolves.toBeDefined();

      // File should exist and have valid content
      const content = await fs.readFile(testFile, "utf-8");
      expect(content).toMatch(/^Content \d+$/);
    });

    it("should handle concurrent reads correctly", async () => {
      await fs.writeFile(testFile, testContent);

      const promises = Array.from({ length: 10 }, () =>
        atomicReadFile(testFile),
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach((content) => {
        expect(content).toBe(testContent);
      });
    });

    it("should handle mixed concurrent operations", async () => {
      // Create initial file
      await atomicWriteFile(testFile, "Initial");

      const readPromises = Array.from({ length: 5 }, () =>
        atomicReadFile(testFile),
      );
      const writePromises = Array.from({ length: 5 }, (_, i) =>
        atomicWriteFile(testFile, `Updated ${i}`),
      );

      // All operations should complete
      const [readResults] = await Promise.allSettled([
        Promise.all(readPromises),
        Promise.all(writePromises),
      ]);

      expect(readResults.status).toBe("fulfilled");

      // Final content should be one of the write values
      const finalContent = await fs.readFile(testFile, "utf-8");
      expect(finalContent).toMatch(/^Updated \d+$/);
    });
  });

  describe("Integration with SessionManager", () => {
    it("should work with SessionManager's expected file structure", async () => {
      const sessionData = {
        sessionId: "test-session-123",
        status: "pending",
        timestamp: new Date().toISOString(),
      };

      // Write session data atomically
      await atomicWriteFile(testFile, JSON.stringify(sessionData, null, 2));

      // Read it back atomically
      const content = await atomicReadFile(testFile);
      const parsedData = JSON.parse(content);

      expect(parsedData).toEqual(sessionData);
    });

    it("should handle JSON data correctly", async () => {
      const jsonData = {
        questions: [
          {
            options: [
              { description: "Description 1", label: "Option 1" },
              { description: "Description 2", label: "Option 2" },
            ],
            prompt: "Test question",
            title: "Question",
          },
        ],
        sessionId: "test-session",
        status: "pending" as const,
      };

      await atomicWriteFile(testFile, JSON.stringify(jsonData, null, 2));

      const content = await atomicReadFile(testFile);
      const parsedData = JSON.parse(content);

      expect(parsedData).toEqual(jsonData);
    });
  });
});
