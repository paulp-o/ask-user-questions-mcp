/**
 * Unit tests for TUI session watcher functionality
 */

import { promises as fs } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_FILES } from "../../session/types.js";
import {
  createTUIWatcher,
  EnhancedTUISessionWatcher,
  getNextPendingSession,
  TUISessionEvent,
} from "../session-watcher.js";

describe("TUI Session Watcher", () => {
  const testDir = "/tmp/auq-tui-watcher-test";
  const sessionDir = join(testDir, "sessions");
  const testSessionId = "test-session-123";

  const mockSessionRequest = {
    questions: [
      {
        options: [
          { description: "Dynamic web language", label: "JavaScript" },
          { description: "Typed JavaScript", label: "TypeScript" },
          { description: "Versatile and readable", label: "Python" },
        ],
        prompt: "What is your favorite programming language?",
      },
    ],
    sessionId: testSessionId,
    status: "pending" as const,
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.rm(testDir, { force: true, recursive: true }).catch(() => {});
    await fs.mkdir(sessionDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory after each test
    await fs.rm(testDir, { force: true, recursive: true }).catch(() => {});
  });

  describe("EnhancedTUISessionWatcher", () => {
    describe("session event detection", () => {
      it("should detect new sessions with loaded data", async () => {
        const watcher = new EnhancedTUISessionWatcher({
          autoLoadData: true,
          sessionDir,
        });

        const events: TUISessionEvent[] = [];

        watcher.startEnhancedWatching((event) => {
          events.push(event);
        });

        // Create a new session directory
        const newSessionDir = join(sessionDir, testSessionId);
        await fs.mkdir(newSessionDir);

        // Create required session files
        const requestFile = join(newSessionDir, SESSION_FILES.REQUEST);
        const statusFile = join(newSessionDir, SESSION_FILES.STATUS);

        await Promise.all([
          fs.writeFile(
            requestFile,
            JSON.stringify(mockSessionRequest, null, 2)
          ),
          fs.writeFile(
            statusFile,
            JSON.stringify({
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              sessionId: testSessionId,
              status: "pending",
              totalQuestions: 1,
            })
          ),
        ]);

        // Wait for event processing
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(events).toHaveLength(1);
        expect(events[0].type).toBe("session-created");
        expect(events[0].sessionId).toBe(testSessionId);
        expect(events[0].sessionRequest).toEqual(mockSessionRequest);

        watcher.stop();
      });

      it("should handle autoLoadData disabled", async () => {
        const watcher = new EnhancedTUISessionWatcher({
          autoLoadData: false,
          sessionDir,
        });

        const events: TUISessionEvent[] = [];

        watcher.startEnhancedWatching((event) => {
          events.push(event);
        });

        // Create session directory and files
        const newSessionDir = join(sessionDir, testSessionId);
        await fs.mkdir(newSessionDir);

        const requestFile = join(newSessionDir, SESSION_FILES.REQUEST);
        await fs.writeFile(
          requestFile,
          JSON.stringify(mockSessionRequest, null, 2)
        );

        // Wait for event processing
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(events).toHaveLength(1);
        expect(events[0].type).toBe("session-created");
        expect(events[0].sessionId).toBe(testSessionId);
        expect(events[0].sessionRequest).toBeUndefined(); // Should not be loaded

        watcher.stop();
      });

      it("should handle corrupted session files gracefully", async () => {
        const watcher = new EnhancedTUISessionWatcher({
          autoLoadData: true,
          sessionDir,
        });

        const events: TUISessionEvent[] = [];
        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        watcher.startEnhancedWatching((event) => {
          events.push(event);
        });

        // Create session with corrupted request.json
        const newSessionDir = join(sessionDir, testSessionId);
        await fs.mkdir(newSessionDir);

        const requestFile = join(newSessionDir, SESSION_FILES.REQUEST);
        await fs.writeFile(requestFile, "invalid json content");

        // Wait for event processing
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(events).toHaveLength(1);
        expect(events[0].type).toBe("session-created");
        expect(events[0].sessionId).toBe(testSessionId);
        expect(events[0].sessionRequest).toBeUndefined();

        // Should have logged a warning about corrupted data
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Failed to load session request"),
          expect.any(Error)
        );

        consoleSpy.mockRestore();
        watcher.stop();
      });
    });

    describe("event handlers", () => {
      it("should support multiple event handlers", async () => {
        const watcher = new EnhancedTUISessionWatcher({ sessionDir });

        const mainEvents: TUISessionEvent[] = [];
        const customEvents: TUISessionEvent[] = [];

        watcher.addEventHandler("custom", (event) => {
          customEvents.push(event);
        });

        watcher.startEnhancedWatching((event) => {
          mainEvents.push(event);
        });

        // Create session
        const newSessionDir = join(sessionDir, testSessionId);
        await fs.mkdir(newSessionDir);

        const requestFile = join(newSessionDir, SESSION_FILES.REQUEST);
        await fs.writeFile(
          requestFile,
          JSON.stringify(mockSessionRequest, null, 2)
        );

        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(mainEvents).toHaveLength(1);
        expect(customEvents).toHaveLength(1);
        expect(customEvents[0]).toEqual(mainEvents[0]);

        watcher.removeEventHandler("custom");
        watcher.stop();
      });

      it("should handle event handler removal", async () => {
        const watcher = new EnhancedTUISessionWatcher({ sessionDir });

        const customEvents: TUISessionEvent[] = [];

        watcher.addEventHandler("custom", (event) => {
          customEvents.push(event);
        });

        watcher.removeEventHandler("custom");

        watcher.startEnhancedWatching(() => {});

        // Create session
        const newSessionDir = join(sessionDir, testSessionId);
        await fs.mkdir(newSessionDir);

        const requestFile = join(newSessionDir, SESSION_FILES.REQUEST);
        await fs.writeFile(
          requestFile,
          JSON.stringify(mockSessionRequest, null, 2)
        );

        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(customEvents).toHaveLength(0); // Should not have triggered

        watcher.stop();
      });
    });

    describe("session management", () => {
      beforeEach(async () => {
        // Create multiple test sessions
        const sessions = [
          { completed: false, id: "session-1" },
          { completed: true, id: "session-2" },
          { completed: false, id: "session-3" },
        ];

        for (const session of sessions) {
          const sessionDir = join(testDir, "sessions", session.id);
          await fs.mkdir(sessionDir, { recursive: true });

          // Create request.json
          const requestFile = join(sessionDir, SESSION_FILES.REQUEST);
          await fs.writeFile(
            requestFile,
            JSON.stringify({
              ...mockSessionRequest,
              sessionId: session.id,
            })
          );

          // Create status.json
          const statusFile = join(sessionDir, SESSION_FILES.STATUS);
          await fs.writeFile(
            statusFile,
            JSON.stringify({
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              sessionId: session.id,
              status: session.completed ? "completed" : "pending",
              totalQuestions: 1,
            })
          );

          // Create answers.json for completed sessions
          if (session.completed) {
            const answersFile = join(sessionDir, SESSION_FILES.ANSWERS);
            await fs.writeFile(
              answersFile,
              JSON.stringify({
                answers: [
                  {
                    questionIndex: 0,
                    selectedOption: "JavaScript",
                    timestamp: new Date().toISOString(),
                  },
                ],
                sessionId: session.id,
                timestamp: new Date().toISOString(),
              })
            );
          }
        }
      });

      it("should get pending sessions correctly", async () => {
        const watcher = new EnhancedTUISessionWatcher({ sessionDir });

        const pendingSessions = await watcher.getPendingSessions();

        expect(pendingSessions).toHaveLength(2);
        expect(pendingSessions).toContain("session-1");
        expect(pendingSessions).toContain("session-3");
        expect(pendingSessions).not.toContain("session-2");

        // Should be sorted
        expect(pendingSessions[0]).toBe("session-1");
        expect(pendingSessions[1]).toBe("session-3");

        watcher.stop();
      });

      it("should get session request data", async () => {
        const watcher = new EnhancedTUISessionWatcher({ sessionDir });

        const sessionRequest = await watcher.getSessionRequest("session-1");

        expect(sessionRequest).toBeTruthy();
        expect(sessionRequest?.sessionId).toBe("session-1");
        expect(sessionRequest?.questions).toHaveLength(1);

        watcher.stop();
      });

      it("should handle non-existent session request", async () => {
        const watcher = new EnhancedTUISessionWatcher({ sessionDir });

        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const sessionRequest = await watcher.getSessionRequest("non-existent");

        expect(sessionRequest).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Failed to load session request"),
          expect.any(Error)
        );

        consoleSpy.mockRestore();
        watcher.stop();
      });

      it("should check session pending status correctly", async () => {
        const watcher = new EnhancedTUISessionWatcher({ sessionDir });

        expect(await watcher.isSessionPending("session-1")).toBe(true);
        expect(await watcher.isSessionPending("session-2")).toBe(false);
        expect(await watcher.isSessionPending("session-3")).toBe(true);
        expect(await watcher.isSessionPending("non-existent")).toBe(false);

        watcher.stop();
      });
    });
  });

  describe("Utility Functions", () => {
    describe("createTUIWatcher", () => {
      it("should create an enhanced TUI session watcher", () => {
        const watcher = createTUIWatcher({ sessionDir });

        expect(watcher).toBeInstanceOf(EnhancedTUISessionWatcher);
        expect(watcher.watchedPath).toBe(sessionDir);

        watcher.stop();
      });
    });

    describe("getNextPendingSession", () => {
      beforeEach(async () => {
        // Create test sessions
        const sessions = [
          { id: "first-session", pending: true },
          { id: "second-session", pending: true },
        ];

        for (const session of sessions) {
          const sessionDir = join(testDir, "sessions", session.id);
          await fs.mkdir(sessionDir, { recursive: true });

          // Create required files
          const requestFile = join(sessionDir, SESSION_FILES.REQUEST);
          const statusFile = join(sessionDir, SESSION_FILES.STATUS);

          await Promise.all([
            fs.writeFile(
              requestFile,
              JSON.stringify({
                ...mockSessionRequest,
                sessionId: session.id,
              })
            ),
            fs.writeFile(
              statusFile,
              JSON.stringify({
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                sessionId: session.id,
                status: "pending",
                totalQuestions: 1,
              })
            ),
          ]);
        }
      });

      it("should get the next pending session", async () => {
        const result = await getNextPendingSession({ sessionDir });

        expect(result).toBeTruthy();
        expect(result?.sessionId).toBe("first-session");
        expect(result?.sessionRequest).toBeTruthy();
        expect(result?.sessionRequest.sessionId).toBe("first-session");
      });

      it("should return null when no pending sessions", async () => {
        // Clear all sessions
        await fs.rm(sessionDir, { recursive: true });
        await fs.mkdir(sessionDir);

        const result = await getNextPendingSession({ sessionDir });

        expect(result).toBeNull();
      });

      it("should handle sessions with corrupted data", async () => {
        // Create session with corrupted request.json
        const corruptedSessionDir = join(sessionDir, "corrupted-session");
        await fs.mkdir(corruptedSessionDir);

        const statusFile = join(corruptedSessionDir, SESSION_FILES.STATUS);
        await fs.writeFile(
          statusFile,
          JSON.stringify({
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            sessionId: "corrupted-session",
            status: "pending",
            totalQuestions: 1,
          })
        );

        // Create corrupted request.json
        const requestFile = join(corruptedSessionDir, SESSION_FILES.REQUEST);
        await fs.writeFile(requestFile, "invalid json");

        const result = await getNextPendingSession({ sessionDir });

        // Should skip corrupted session and return valid one
        expect(result).toBeTruthy();
        expect(result?.sessionId).toBe("first-session");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle directory access errors", async () => {
      const watcher = new EnhancedTUISessionWatcher({
        sessionDir: "/invalid/directory/path",
      });

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const pendingSessions = await watcher.getPendingSessions();

      expect(pendingSessions).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to scan for pending sessions"),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      watcher.stop();
    });

    it("should handle missing watched path gracefully", async () => {
      const watcher = new EnhancedTUISessionWatcher({
        sessionDir: "/non/existent/path",
      });

      const sessionRequest = await watcher.getSessionRequest("any-id");

      expect(sessionRequest).toBeNull();

      watcher.stop();
    });
  });
});
