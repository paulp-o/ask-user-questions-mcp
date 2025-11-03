/**
 * Unit tests for SessionManager class
 */

import { promises as fs } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Question, SessionAnswer, SessionConfig } from "../types.js";

import { SessionManager } from "../SessionManager.js";
import { getCurrentTimestamp } from "../utils.js";

describe("SessionManager", () => {
  let sessionManager: SessionManager;
  const testBaseDir = "/tmp/auq-test-sessions";

  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});

    sessionManager = new SessionManager({
      baseDir: testBaseDir,
      maxSessions: 10,
      sessionTimeout: 1000, // 1 second for testing
    } as SessionConfig);

    await sessionManager.initialize();
  });

  afterEach(async () => {
    // Clean up test directory after each test
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
  });

  describe("initialization", () => {
    it("should create session directory with proper permissions", async () => {
      const isValid = await fs
        .access(testBaseDir)
        .then(() => true)
        .catch(() => false);
      expect(isValid).toBe(true);
    });

    it("should throw error for invalid directory", async () => {
      const invalidManager = new SessionManager({
        baseDir: "/invalid/path/that/cannot/be/created",
      });

      await expect(invalidManager.initialize()).rejects.toThrow();
    });
  });

  describe("createSession", () => {
    const sampleQuestions: Question[] = [
      {
        options: [
          { description: "Dynamic scripting language", label: "JavaScript" },
          { description: "Typed superset of JavaScript", label: "TypeScript" },
          { description: "High-level interpreted language", label: "Python" },
        ],
        prompt: "Which programming language do you prefer?",
        title: "Language",
      },
    ];

    it("should create a new session with unique ID", async () => {
      const sessionId = await sessionManager.createSession(sampleQuestions);

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe("string");

      // Verify session directory exists
      const sessionDir = `${testBaseDir}/${sessionId}`;
      const stat = await fs.stat(sessionDir);
      expect(stat.isDirectory()).toBe(true);

      // Verify session files exist
      const requestExists = await fs
        .access(`${sessionDir}/request.json`)
        .then(() => true)
        .catch(() => false);
      const statusExists = await fs
        .access(`${sessionDir}/status.json`)
        .then(() => true)
        .catch(() => false);

      expect(requestExists).toBe(true);
      expect(statusExists).toBe(true);
    });

    it("should create sessions with different IDs", async () => {
      const sessionId1 = await sessionManager.createSession(sampleQuestions);
      const sessionId2 = await sessionManager.createSession(sampleQuestions);

      expect(sessionId1).not.toBe(sessionId2);
    });

    it("should throw error for empty questions array", async () => {
      await expect(sessionManager.createSession([])).rejects.toThrow(
        "At least one question is required to create a session",
      );
    });

    it("should throw error for null questions", async () => {
      await expect(
        sessionManager.createSession(null as unknown as Question[]),
      ).rejects.toThrow(
        "At least one question is required to create a session",
      );
    });

    it("should store correct session data", async () => {
      const sessionId = await sessionManager.createSession(sampleQuestions);

      const request = await sessionManager.getSessionRequest(sessionId);
      const status = await sessionManager.getSessionStatus(sessionId);

      expect(request?.sessionId).toBe(sessionId);
      expect(request?.questions).toEqual(sampleQuestions);
      expect(request?.status).toBe("pending");

      expect(status?.sessionId).toBe(sessionId);
      expect(status?.status).toBe("pending");
      expect(status?.totalQuestions).toBe(sampleQuestions.length);
      expect(status?.currentQuestionIndex).toBeUndefined();
    });
  });

  describe("sessionExists", () => {
    it("should return true for existing session", async () => {
      const questions = [
        { options: [{ label: "Option" }], prompt: "Test", title: "Test" },
      ];
      const sessionId = await sessionManager.createSession(questions);

      const exists = await sessionManager.sessionExists(sessionId);
      expect(exists).toBe(true);
    });

    it("should return false for non-existing session", async () => {
      const exists = await sessionManager.sessionExists("non-existent-id");
      expect(exists).toBe(false);
    });
  });

  describe("getSessionStatus", () => {
    it("should return session status for existing session", async () => {
      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];
      const sessionId = await sessionManager.createSession(questions);

      const status = await sessionManager.getSessionStatus(sessionId);

      expect(status).toBeDefined();
      expect(status?.sessionId).toBe(sessionId);
      expect(status?.status).toBe("pending");
      expect(status?.totalQuestions).toBe(1);
    });

    it("should return null for non-existing session", async () => {
      const status = await sessionManager.getSessionStatus("non-existent-id");
      expect(status).toBe(null);
    });
  });

  describe("getSessionRequest", () => {
    it("should return session request for existing session", async () => {
      const questions = [
        {
          options: [{ description: "Test description", label: "Test option" }],
          prompt: "Test question",
          title: "Test",
        },
      ];
      const sessionId = await sessionManager.createSession(questions);

      const request = await sessionManager.getSessionRequest(sessionId);

      expect(request).toBeDefined();
      expect(request?.sessionId).toBe(sessionId);
      expect(request?.questions).toEqual(questions);
      expect(request?.status).toBe("pending");
    });

    it("should return null for non-existing session", async () => {
      const request = await sessionManager.getSessionRequest("non-existent-id");
      expect(request).toBe(null);
    });
  });

  describe("updateSessionStatus", () => {
    it("should update session status successfully", async () => {
      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];
      const sessionId = await sessionManager.createSession(questions);

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1));

      await sessionManager.updateSessionStatus(sessionId, "in-progress", {
        currentQuestionIndex: 0,
      });

      const status = await sessionManager.getSessionStatus(sessionId);
      expect(status?.status).toBe("in-progress");
      expect(status?.currentQuestionIndex).toBe(0);
      expect(status?.lastModified).not.toBe(status?.createdAt);
    });

    it("should throw error for non-existing session", async () => {
      await expect(
        sessionManager.updateSessionStatus("non-existent-id", "completed"),
      ).rejects.toThrow("Session not found: non-existent-id");
    });
  });

  describe("getSessionCount", () => {
    it("should return 0 for no sessions", async () => {
      const count = await sessionManager.getSessionCount();
      expect(count).toBe(0);
    });

    it("should return correct count for multiple sessions", async () => {
      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];

      await sessionManager.createSession(questions);
      await sessionManager.createSession(questions);
      await sessionManager.createSession(questions);

      const count = await sessionManager.getSessionCount();
      expect(count).toBe(3);
    });
  });

  describe("getAllSessionIds", () => {
    it("should return empty array for no sessions", async () => {
      const ids = await sessionManager.getAllSessionIds();
      expect(ids).toEqual([]);
    });

    it("should return all session IDs", async () => {
      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];

      const id1 = await sessionManager.createSession(questions);
      const id2 = await sessionManager.createSession(questions);

      const ids = await sessionManager.getAllSessionIds();
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
      expect(ids.length).toBe(2);
    });
  });

  describe("isSessionLimitReached", () => {
    it("should return false when under limit", async () => {
      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];
      await sessionManager.createSession(questions);

      const isLimitReached = await sessionManager.isSessionLimitReached();
      expect(isLimitReached).toBe(false);
    });

    it("should return true when at limit", async () => {
      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];

      // Create sessions up to the limit (10)
      for (let i = 0; i < 10; i++) {
        await sessionManager.createSession(questions);
      }

      const isLimitReached = await sessionManager.isSessionLimitReached();
      expect(isLimitReached).toBe(true);
    });
  });

  describe("deleteSession", () => {
    it("should delete session and all files", async () => {
      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];
      const sessionId = await sessionManager.createSession(questions);

      // Verify session exists
      expect(await sessionManager.sessionExists(sessionId)).toBe(true);

      // Delete session
      await sessionManager.deleteSession(sessionId);

      // Verify session is deleted
      expect(await sessionManager.sessionExists(sessionId)).toBe(false);
    });
  });

  describe("cleanupExpiredSessions", () => {
    it("should clean up expired sessions based on retention period", async () => {
      // Create a manager with short retention period for testing
      const shortRetentionManager = new SessionManager({
        baseDir: testBaseDir,
        retentionPeriod: 500, // 500ms retention
      } as SessionConfig);

      await shortRetentionManager.initialize();

      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];
      const sessionId = await shortRetentionManager.createSession(questions);

      // Wait for retention period to expire
      await new Promise((resolve) => setTimeout(resolve, 600));

      const cleanedCount = await shortRetentionManager.cleanupExpiredSessions();
      expect(cleanedCount).toBe(1);
      expect(await shortRetentionManager.sessionExists(sessionId)).toBe(false);
    });

    it("should not clean up active sessions", async () => {
      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];
      const sessionId = await sessionManager.createSession(questions);

      // Clean up immediately (session should not be expired yet)
      const cleanedCount = await sessionManager.cleanupExpiredSessions();
      expect(cleanedCount).toBe(0);
      expect(await sessionManager.sessionExists(sessionId)).toBe(true);
    });

    it("should respect retention period independently from session timeout", async () => {
      // Create a new manager with short retention period (500ms) but no session timeout
      const retentionManager = new SessionManager({
        baseDir: testBaseDir,
        retentionPeriod: 500, // 500ms retention
        sessionTimeout: 0, // No timeout (infinite wait)
      } as SessionConfig);

      await retentionManager.initialize();

      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];
      const sessionId = await retentionManager.createSession(questions);

      // Wait for retention period to expire
      await new Promise((resolve) => setTimeout(resolve, 600));

      const cleanedCount = await retentionManager.cleanupExpiredSessions();
      expect(cleanedCount).toBe(1);
      expect(await retentionManager.sessionExists(sessionId)).toBe(false);
    });

    it("should preserve sessions within retention period", async () => {
      // Create manager with 7-day retention period (default)
      const retentionManager = new SessionManager({
        baseDir: testBaseDir,
        retentionPeriod: 604800000, // 7 days
      } as SessionConfig);

      await retentionManager.initialize();

      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];
      const sessionId = await retentionManager.createSession(questions);

      // Clean up immediately - session should be preserved
      const cleanedCount = await retentionManager.cleanupExpiredSessions();
      expect(cleanedCount).toBe(0);
      expect(await retentionManager.sessionExists(sessionId)).toBe(true);
    });

    it("should not cleanup when retentionPeriod is 0", async () => {
      // Create manager with retention disabled
      const noRetentionManager = new SessionManager({
        baseDir: testBaseDir,
        retentionPeriod: 0, // Disabled
      } as SessionConfig);

      await noRetentionManager.initialize();

      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];
      const sessionId = await noRetentionManager.createSession(questions);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not clean up even old sessions
      const cleanedCount = await noRetentionManager.cleanupExpiredSessions();
      expect(cleanedCount).toBe(0);
      expect(await noRetentionManager.sessionExists(sessionId)).toBe(true);
    });

    it("should use default 7-day retention period when not specified", async () => {
      // Create manager without specifying retention period
      const defaultManager = new SessionManager({
        baseDir: testBaseDir,
      } as SessionConfig);

      await defaultManager.initialize();

      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];
      const sessionId = await defaultManager.createSession(questions);

      // Clean up immediately - should preserve with default 7-day retention
      const cleanedCount = await defaultManager.cleanupExpiredSessions();
      expect(cleanedCount).toBe(0);
      expect(await defaultManager.sessionExists(sessionId)).toBe(true);
    });
  });

  describe("validateSession", () => {
    it("should validate a correct session", async () => {
      const questions = [
        { options: [{ label: "Opt" }], prompt: "Test", title: "Test" },
      ];
      const sessionId = await sessionManager.createSession(questions);

      const validation = await sessionManager.validateSession(sessionId);
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    it("should detect issues with invalid session", async () => {
      const validation = await sessionManager.validateSession("non-existent");
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain("Session directory does not exist");
    });
  });

  describe("getConfig", () => {
    it("should return configuration", () => {
      const config = sessionManager.getConfig();
      expect(config.baseDir).toBe(testBaseDir);
      expect(config.maxSessions).toBe(10);
      expect(config.sessionTimeout).toBe(1000);
    });
  });

  describe("startSession - Complete Lifecycle", () => {
    it("should complete full lifecycle successfully", async () => {
      const questions: Question[] = [
        {
          options: [
            { description: "Dynamic web language", label: "JavaScript" },
            { description: "Type-safe JavaScript", label: "TypeScript" },
          ],
          prompt: "What is your favorite programming language?",
          title: "Language",
        },
        {
          options: [
            { description: "Web application", label: "Web" },
            { description: "Command-line tool", label: "CLI" },
          ],
          prompt: "What type of application are you building?",
          title: "App Type",
        },
      ];

      // Start session in background
      const sessionPromise = sessionManager.startSession(questions);

      // Wait a bit for session files to be created
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get the session ID from directory listing
      const entries = await fs.readdir(testBaseDir);
      expect(entries.length).toBe(1);
      const sessionId = entries[0];

      // Simulate user submitting answers
      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "TypeScript",
            timestamp: getCurrentTimestamp(),
          },
          {
            customText: "Desktop app with Electron",
            questionIndex: 1,
            timestamp: getCurrentTimestamp(),
          },
        ],
        sessionId,
        timestamp: getCurrentTimestamp(),
      };

      await sessionManager.saveSessionAnswers(sessionId, answers);

      // Wait for session to complete
      const result = await sessionPromise;

      expect(result.sessionId).toBe(sessionId);
      expect(result.formattedResponse).toContain(
        "Here are the user's answers:",
      );
      expect(result.formattedResponse).toContain("TypeScript");
      expect(result.formattedResponse).toContain("Desktop app with Electron");

      // Verify final status is completed
      const status = await sessionManager.getSessionStatus(sessionId);
      expect(status?.status).toBe("completed");
    });

    it("should timeout and set status to timed_out", async () => {
      // Create session manager with short timeout for testing
      const shortTimeoutManager = new SessionManager({
        baseDir: testBaseDir,
        sessionTimeout: 500, // 500ms
      });
      await shortTimeoutManager.initialize();

      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Test question",
          title: "Test",
        },
      ];

      // Start session but don't provide answers
      await expect(shortTimeoutManager.startSession(questions)).rejects.toThrow(
        "timed out",
      );

      // Wait a bit to ensure the status is updated
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify status was set to timed_out
      const entries = await fs.readdir(testBaseDir);
      const sessionId = entries[entries.length - 1]; // Get the last created session

      const status = await shortTimeoutManager.getSessionStatus(sessionId);
      expect(status?.status).toBe("timed_out");
    });

    it("should handle invalid answers file", async () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Test question",
          title: "Test",
        },
      ];

      // Start session in background
      const sessionPromise = sessionManager.startSession(questions);

      // Wait for session files to be created
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get session ID
      const entries = await fs.readdir(testBaseDir);
      const sessionId = entries[entries.length - 1];

      // Write invalid answers file
      const answersPath = join(testBaseDir, sessionId, "answers.json");
      await fs.writeFile(answersPath, "invalid json");

      // Should reject with validation error
      await expect(sessionPromise).rejects.toThrow("Failed to parse JSON");

      // Verify status was set to abandoned
      const status = await sessionManager.getSessionStatus(sessionId);
      expect(status?.status).toBe("abandoned");
    });

    it("should handle answer validation errors", async () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }, { label: "Option 2" }],
          prompt: "Test question",
          title: "Test",
        },
      ];

      // Start session in background
      const sessionPromise = sessionManager.startSession(questions);

      // Wait for session files to be created
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get session ID
      const entries = await fs.readdir(testBaseDir);
      const sessionId = entries[entries.length - 1];

      // Submit answer with invalid option
      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "Invalid Option", // Not in the options list
            timestamp: getCurrentTimestamp(),
          },
        ],
        sessionId,
        timestamp: getCurrentTimestamp(),
      };

      await sessionManager.saveSessionAnswers(sessionId, answers);

      // Should reject with validation error
      await expect(sessionPromise).rejects.toThrow("Answer validation failed");

      // Verify status was set to abandoned
      const status = await sessionManager.getSessionStatus(sessionId);
      expect(status?.status).toBe("abandoned");
    });

    it("should format response according to PRD specification", async () => {
      const questions: Question[] = [
        {
          options: [
            { description: "The color of fire", label: "Red" },
            { description: "The color of sky", label: "Blue" },
          ],
          prompt: "What is your favorite color?",
          title: "Color",
        },
      ];

      // Start session in background
      const sessionPromise = sessionManager.startSession(questions);

      // Wait for session files to be created
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get session ID
      const entries = await fs.readdir(testBaseDir);
      const sessionId = entries[entries.length - 1];

      // Submit answer
      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "Blue",
            timestamp: getCurrentTimestamp(),
          },
        ],
        sessionId,
        timestamp: getCurrentTimestamp(),
      };

      await sessionManager.saveSessionAnswers(sessionId, answers);

      // Wait for completion
      const result = await sessionPromise;

      // Verify PRD-compliant format
      expect(result.formattedResponse).toBe(
        "Here are the user's answers:\n\n" +
          "1. What is your favorite color?\n" +
          "→ Blue — The color of sky",
      );
    });

    it.skip("should handle concurrent sessions independently", async () => {
      const questions1: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Question 1",
          title: "Test 1",
        },
      ];

      const questions2: Question[] = [
        {
          options: [{ label: "Option 2" }],
          prompt: "Question 2",
          title: "Test 2",
        },
      ];

      // Start two sessions concurrently
      const session1Promise = sessionManager.startSession(questions1);
      const session2Promise = sessionManager.startSession(questions2);

      // Wait for both sessions to be created
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get both session IDs
      const entries = await fs.readdir(testBaseDir);
      expect(entries.length).toBeGreaterThanOrEqual(2);
      const sessionId1 = entries[entries.length - 2];
      const sessionId2 = entries[entries.length - 1];

      // Submit answers for both sessions
      await sessionManager.saveSessionAnswers(sessionId1, {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "Option 1",
            timestamp: getCurrentTimestamp(),
          },
        ],
        sessionId: sessionId1,
        timestamp: getCurrentTimestamp(),
      });

      await sessionManager.saveSessionAnswers(sessionId2, {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "Option 2",
            timestamp: getCurrentTimestamp(),
          },
        ],
        sessionId: sessionId2,
        timestamp: getCurrentTimestamp(),
      });

      // Wait for both to complete
      const [result1, result2] = await Promise.all([
        session1Promise,
        session2Promise,
      ]);

      // Verify both completed independently
      expect(result1.sessionId).toBe(sessionId1);
      expect(result1.formattedResponse).toContain("Option 1");
      expect(result2.sessionId).toBe(sessionId2);
      expect(result2.formattedResponse).toContain("Option 2");
    });
  });
});
