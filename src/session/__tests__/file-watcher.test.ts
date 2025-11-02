/**
 * Unit tests for file system watching functionality
 */

import { promises as fs } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PromiseFileWatcher, TUISessionWatcher } from "../file-watcher.js";
import { SESSION_FILES } from "../types.js";

describe("File System Watching", () => {
  const testDir = "/tmp/auq-file-watcher-test";
  const sessionDir = join(testDir, "sessions");
  const testSessionId = "test-session-123";

  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.rm(testDir, { force: true, recursive: true }).catch(() => {});
    await fs.mkdir(sessionDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory after each test
    await fs.rm(testDir, { force: true, recursive: true }).catch(() => {});
  });

  describe("PromiseFileWatcher", () => {
    describe("waitForFile", () => {
      it("should resolve when target file is created", async () => {
        const watcher = new PromiseFileWatcher({
          debounceMs: 50,
          timeoutMs: 2000,
        });

        const testFile = "test-file.txt";
        const filePath = join(sessionDir, testFile);

        // Start watching for the file
        const filePromise = watcher.waitForFile(sessionDir, testFile);

        // Create the file after a short delay
        setTimeout(async () => {
          await fs.writeFile(filePath, "test content");
        }, 100);

        // Should resolve when file is created
        const result = await filePromise;
        expect(result).toBe(filePath);

        watcher.cleanup();
      });

      it("should timeout when file is not created", async () => {
        const watcher = new PromiseFileWatcher({
          debounceMs: 50,
          timeoutMs: 200,
        });

        const testFile = "non-existent-file.txt";

        try {
          await watcher.waitForFile(sessionDir, testFile);
          expect.fail("Should have timed out");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain(
            "Timeout waiting for file"
          );
        }

        watcher.cleanup();
      });

      it("should handle file watcher errors gracefully", async () => {
        const watcher = new PromiseFileWatcher({
          timeoutMs: 1000,
        });

        const invalidDir = "/invalid/directory/that/does/not/exist";

        try {
          await watcher.waitForFile(invalidDir, "test.txt");
          expect.fail("Should have failed with invalid directory");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain(
            "File watcher setup error"
          );
        }

        watcher.cleanup();
      });

      it("should handle rapid file events with debouncing", async () => {
        const watcher = new PromiseFileWatcher({
          debounceMs: 200,
          timeoutMs: 2000,
        });

        const testFile = "rapid-events.txt";
        const filePath = join(sessionDir, testFile);

        // Start watching
        const filePromise = watcher.waitForFile(sessionDir, testFile);

        // Create multiple rapid events
        setTimeout(async () => {
          await fs.writeFile(filePath, "content 1");
          await fs.writeFile(filePath, "content 2");
          await fs.writeFile(filePath, "content 3");
        }, 100);

        // Should still resolve correctly despite rapid events
        const result = await filePromise;
        expect(result).toBe(filePath);

        watcher.cleanup();
      });
    });

    describe("watchForSessions", () => {
      it("should detect new session directories", async () => {
        const watcher = new PromiseFileWatcher({
          debounceMs: 50,
        });

        const sessionEvents: Array<{ sessionId: string; sessionPath: string }> =
          [];

        // Start watching for sessions
        watcher.watchForSessions(sessionDir, (sessionId, sessionPath) => {
          sessionEvents.push({ sessionId, sessionPath });
        });

        // Give watcher time to initialize
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Create a new session directory
        const newSessionDir = join(sessionDir, testSessionId);
        await fs.mkdir(newSessionDir);

        // Create the required request.json file
        const requestFile = join(newSessionDir, SESSION_FILES.REQUEST);
        await fs.writeFile(
          requestFile,
          JSON.stringify({
            questions: [
              {
                title: "Test",
                options: [{ label: "Option 1" }],
                prompt: "Test question",
              },
            ],
            sessionId: testSessionId,
            status: "pending",
            timestamp: new Date().toISOString(),
          })
        );

        // Wait for debounce (50ms) + processing time
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(sessionEvents).toHaveLength(1);
        expect(sessionEvents[0].sessionId).toBe(testSessionId);
        expect(sessionEvents[0].sessionPath).toBe(newSessionDir);

        watcher.cleanup();
      });

      it("should ignore directories without request.json", async () => {
        const watcher = new PromiseFileWatcher({
          debounceMs: 50,
        });

        const sessionEvents: Array<{ sessionId: string; sessionPath: string }> =
          [];

        // Start watching for sessions
        watcher.watchForSessions(sessionDir, (sessionId, sessionPath) => {
          sessionEvents.push({ sessionId, sessionPath });
        });

        // Create a directory without request.json
        const invalidSessionDir = join(sessionDir, "invalid-session");
        await fs.mkdir(invalidSessionDir);

        // Wait a bit for potential events
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should not have detected this as a session
        expect(sessionEvents).toHaveLength(0);

        watcher.cleanup();
      });

      it("should emit error events on watcher errors", async () => {
        const watcher = new PromiseFileWatcher();

        const errors: Error[] = [];

        watcher.on("error", (error) => {
          errors.push(error);
        });

        // Try to watch an invalid directory
        watcher.watchForSessions("/invalid/path", () => {});

        // Wait for error to be emitted
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain("Session watcher setup error");

        watcher.cleanup();
      });
    });

    describe("cleanup", () => {
      it("should clean up all resources properly", async () => {
        const watcher = new PromiseFileWatcher({
          debounceMs: 50,
          timeoutMs: 1000, // Add timeout to prevent hanging
        });

        // Start watching
        const filePromise = watcher.waitForFile(sessionDir, "test.txt");

        // Should be active
        expect(watcher.active()).toBe(true);

        // Clean up
        watcher.cleanup();

        // Should no longer be active
        expect(watcher.active()).toBe(false);

        // The promise should reject due to cleanup (or timeout)
        try {
          await filePromise;
          expect.fail("Promise should have been rejected or timed out");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });
    });
  });

  describe("TUISessionWatcher", () => {
    describe("session detection", () => {
      it("should detect new sessions when watching", async () => {
        const tuiWatcher = new TUISessionWatcher({
          baseDir: testDir, // This should be the base directory, not sessions
          debounceMs: 100, // Shorter debounce for testing
        });

        const detectedSessions: Array<{
          sessionId: string;
          sessionPath: string;
        }> = [];

        // Start watching
        tuiWatcher.startWatching((sessionId, sessionPath) => {
          detectedSessions.push({ sessionId, sessionPath });
        });

        // Create a new session in the correct watched path
        const newSessionDir = join(tuiWatcher.watchedPath, testSessionId);
        await fs.mkdir(newSessionDir, { recursive: true });

        const requestFile = join(newSessionDir, SESSION_FILES.REQUEST);
        const statusFile = join(newSessionDir, SESSION_FILES.STATUS);

        // Write files atomically
        await Promise.all([
          fs.writeFile(
            requestFile,
            JSON.stringify({
              questions: [],
              sessionId: testSessionId,
              status: "pending",
              timestamp: new Date().toISOString(),
            })
          ),
          fs.writeFile(
            statusFile,
            JSON.stringify({
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              sessionId: testSessionId,
              status: "pending",
              totalQuestions: 0,
            })
          ),
        ]);

        // Wait for debounce (100ms) + processing time
        await new Promise((resolve) => setTimeout(resolve, 300));

        expect(detectedSessions).toHaveLength(1);
        expect(detectedSessions[0].sessionId).toBe(testSessionId);

        tuiWatcher.stop();
      });

      it("should use correct XDG-compliant path", () => {
        const tuiWatcher = new TUISessionWatcher({
          baseDir: "~/.local/share/auq/sessions",
        });

        const watchedPath = tuiWatcher.watchedPath;

        // Should resolve to an absolute path (not the ~ path)
        expect(watchedPath).not.toContain("~");
        expect(watchedPath).toContain("auq");
        expect(watchedPath).toContain("sessions");

        tuiWatcher.stop();
      });
    });
  });

  describe("Cross-Platform Behavior", () => {
    it("should handle different path separators correctly", async () => {
      const watcher = new PromiseFileWatcher({
        debounceMs: 50,
        timeoutMs: 1000,
      });

      // Test with different path formats
      const testFile = "cross-platform-test.txt";
      const filePath = join(sessionDir, testFile);

      const filePromise = watcher.waitForFile(sessionDir, testFile);

      // Create file using Node.js path utilities (should work on all platforms)
      setTimeout(async () => {
        await fs.writeFile(filePath, "cross-platform content");
      }, 100);

      const result = await filePromise;
      expect(result).toBe(filePath);

      watcher.cleanup();
    });

    it("should handle special characters in file names", async () => {
      const watcher = new PromiseFileWatcher({
        debounceMs: 50,
        timeoutMs: 1000,
      });

      const specialFileName = "test-with-special-chars-@#$%.txt";
      const filePath = join(sessionDir, specialFileName);

      const filePromise = watcher.waitForFile(sessionDir, specialFileName);

      setTimeout(async () => {
        await fs.writeFile(filePath, "special content");
      }, 100);

      const result = await filePromise;
      expect(result).toBe(filePath);

      watcher.cleanup();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty session directories", async () => {
      const watcher = new PromiseFileWatcher({
        debounceMs: 50,
      });

      const sessionEvents: Array<{ sessionId: string; sessionPath: string }> =
        [];

      watcher.watchForSessions(sessionDir, (sessionId, sessionPath) => {
        sessionEvents.push({ sessionId, sessionPath });
      });

      // Create empty directory
      const emptySessionDir = join(sessionDir, "empty-session");
      await fs.mkdir(emptySessionDir);

      // Wait to ensure no false positives
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sessionEvents).toHaveLength(0);

      watcher.cleanup();
    });

    it("should handle concurrent file operations", async () => {
      const watcher = new PromiseFileWatcher({
        debounceMs: 50,
        timeoutMs: 2000,
      });

      const testFile = "concurrent-test.txt";
      const filePath = join(sessionDir, testFile);

      const filePromise = watcher.waitForFile(sessionDir, testFile);

      // Create multiple files concurrently
      setTimeout(async () => {
        const promises = Array.from({ length: 5 }, (_, i) =>
          fs.writeFile(join(sessionDir, `file-${i}.txt`), `content ${i}`)
        );

        // Create the target file last
        await Promise.all(promises);
        await fs.writeFile(filePath, "target content");
      }, 100);

      const result = await filePromise;
      expect(result).toBe(filePath);

      watcher.cleanup();
    });
  });
});
