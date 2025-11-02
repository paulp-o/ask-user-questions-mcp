/**
 * Integration tests for FastMCP server and SessionManager interaction
 */

import { promises as fs } from "fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Question } from "../session/types.js";

import { SessionManager } from "../session/index.js";

describe("Server Integration", () => {
  let sessionManager: SessionManager;
  const testBaseDir = "/tmp/auq-test-integration";

  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});

    sessionManager = new SessionManager({
      baseDir: testBaseDir,
      maxSessions: 10,
      sessionTimeout: 5000, // 5 seconds for integration tests
    });

    await sessionManager.initialize();
  });

  afterEach(async () => {
    // Clean up test directory after each test
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
  });

  describe("Session Creation Integration", () => {
    it("should create session when ask_user_questions tool is called", async () => {
      const questions: Question[] = [
        {
          options: [
            { description: "Dynamic language", label: "JavaScript" },
            { description: "Static typing", label: "TypeScript" },
          ],
          prompt: "Which programming language do you prefer?",
          title: "Language",
        },
      ];

      const sessionId = await sessionManager.createSession(questions);

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe("string");

      // Verify session data integrity
      const request = await sessionManager.getSessionRequest(sessionId);
      const status = await sessionManager.getSessionStatus(sessionId);

      expect(request?.sessionId).toBe(sessionId);
      expect(request?.questions).toEqual(questions);
      expect(request?.status).toBe("pending");

      expect(status?.sessionId).toBe(sessionId);
      expect(status?.status).toBe("pending");
      expect(status?.totalQuestions).toBe(questions.length);
    });

    it("should handle multiple questions correctly", async () => {
      const questions: Question[] = [
        {
          options: [
            { description: "Dynamic language", label: "JavaScript" },
            { description: "Static typing", label: "TypeScript" },
          ],
          prompt: "Which programming language?",
          title: "Language",
        },
        {
          options: [
            { description: "Web application", label: "Web" },
            { description: "Command-line tool", label: "CLI" },
            { description: "Desktop application", label: "Desktop" },
          ],
          prompt: "What type of application?",
          title: "App Type",
        },
      ];

      const sessionId = await sessionManager.createSession(questions);

      const request = await sessionManager.getSessionRequest(sessionId);
      const status = await sessionManager.getSessionStatus(sessionId);

      expect(request?.questions).toHaveLength(2);
      expect(request?.questions[0].prompt).toBe("Which programming language?");
      expect(request?.questions[1].prompt).toBe("What type of application?");
      expect(status?.totalQuestions).toBe(2);
    });

    it("should create unique sessions for multiple calls", async () => {
      const questions = [
        {
          options: [{ label: "Test option" }],
          prompt: "Test question",
          title: "Test",
        },
      ];

      const sessionId1 = await sessionManager.createSession(questions);
      const sessionId2 = await sessionManager.createSession(questions);

      expect(sessionId1).not.toBe(sessionId2);

      // Verify both sessions exist and are independent
      expect(await sessionManager.sessionExists(sessionId1)).toBe(true);
      expect(await sessionManager.sessionExists(sessionId2)).toBe(true);

      const request1 = await sessionManager.getSessionRequest(sessionId1);
      const request2 = await sessionManager.getSessionRequest(sessionId2);

      expect(request1?.sessionId).toBe(sessionId1);
      expect(request2?.sessionId).toBe(sessionId2);
    });
  });

  describe("Session Data Persistence", () => {
    it("should persist session data across manager instances", async () => {
      const questions: Question[] = [
        {
          options: [{ description: "Test description", label: "Test option" }],
          prompt: "Test question for persistence",
          title: "Persistence",
        },
      ];

      // Create session with first manager instance
      const sessionId = await sessionManager.createSession(questions);

      // Create new manager instance with same directory
      const newManager = new SessionManager({ baseDir: testBaseDir });
      await newManager.initialize();

      // Verify session data is accessible through new manager
      const request = await newManager.getSessionRequest(sessionId);
      const status = await newManager.getSessionStatus(sessionId);

      expect(request?.sessionId).toBe(sessionId);
      expect(request?.questions).toEqual(questions);
      expect(status?.sessionId).toBe(sessionId);
      expect(status?.totalQuestions).toBe(1);
    });

    it("should store session files with correct structure", async () => {
      const questions: Question[] = [
        {
          options: [{ description: "Description", label: "Option" }],
          prompt: "File structure test",
          title: "Structure",
        },
      ];

      const sessionId = await sessionManager.createSession(questions);
      const sessionDir = `${testBaseDir}/${sessionId}`;

      // Verify request.json structure
      const requestContent = await fs.readFile(
        `${sessionDir}/request.json`,
        "utf-8",
      );
      const requestData = JSON.parse(requestContent);

      expect(requestData).toHaveProperty("sessionId", sessionId);
      expect(requestData).toHaveProperty("questions");
      expect(requestData).toHaveProperty("timestamp");
      expect(requestData).toHaveProperty("status", "pending");
      expect(requestData.questions).toEqual(questions);

      // Verify status.json structure
      const statusContent = await fs.readFile(
        `${sessionDir}/status.json`,
        "utf-8",
      );
      const statusData = JSON.parse(statusContent);

      expect(statusData).toHaveProperty("sessionId", sessionId);
      expect(statusData).toHaveProperty("status", "pending");
      expect(statusData).toHaveProperty("createdAt");
      expect(statusData).toHaveProperty("lastModified");
      expect(statusData).toHaveProperty("totalQuestions", 1);
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle invalid session directory gracefully", async () => {
      const invalidManager = new SessionManager({
        baseDir: "/root/invalid/path",
      });

      await expect(invalidManager.initialize()).rejects.toThrow();
    });

    it("should handle concurrent session creation", async () => {
      const questions = [
        {
          options: [{ label: "Option" }],
          prompt: "Concurrent test",
          title: "Concurrent",
        },
      ];

      // Create multiple sessions concurrently
      const sessionPromises = Array.from({ length: 5 }, () =>
        sessionManager.createSession(questions),
      );

      const sessionIds = await Promise.all(sessionPromises);

      // Verify all sessions were created with unique IDs
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(5);

      // Verify all sessions exist and are valid
      for (const sessionId of sessionIds) {
        expect(await sessionManager.sessionExists(sessionId)).toBe(true);
        const validation = await sessionManager.validateSession(sessionId);
        expect(validation.isValid).toBe(true);
      }
    });
  });

  describe("Session Lifecycle Integration", () => {
    it("should support complete session lifecycle", async () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option" }],
          prompt: "Lifecycle test",
          title: "Lifecycle",
        },
      ];

      // Create session
      const sessionId = await sessionManager.createSession(questions);
      expect(await sessionManager.sessionExists(sessionId)).toBe(true);

      // Update status to in-progress
      await sessionManager.updateSessionStatus(sessionId, "in-progress", {
        currentQuestionIndex: 0,
      });

      let status = await sessionManager.getSessionStatus(sessionId);
      expect(status?.status).toBe("in-progress");
      expect(status?.currentQuestionIndex).toBe(0);

      // Save answers
      const answers = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "Option",
            timestamp: new Date().toISOString(),
          },
        ],
        sessionId,
        timestamp: new Date().toISOString(),
      };

      await sessionManager.saveSessionAnswers(sessionId, answers);

      // Verify final state
      status = await sessionManager.getSessionStatus(sessionId);
      expect(status?.status).toBe("completed");

      const savedAnswers = await sessionManager.getSessionAnswers(sessionId);
      expect(savedAnswers?.answers).toHaveLength(1);
      expect(savedAnswers?.answers[0].selectedOption).toBe("Option");

      // Cleanup
      await sessionManager.deleteSession(sessionId);
      expect(await sessionManager.sessionExists(sessionId)).toBe(false);
    });

    it("should handle session validation correctly", async () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option" }],
          prompt: "Validation test",
          title: "Validation",
        },
      ];

      const sessionId = await sessionManager.createSession(questions);
      const validation = await sessionManager.validateSession(sessionId);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toEqual([]);

      // Corrupt the session by removing a required file
      const sessionDir = `${testBaseDir}/${sessionId}`;
      await fs.rm(`${sessionDir}/status.json`);

      const validation2 = await sessionManager.validateSession(sessionId);
      expect(validation2.isValid).toBe(false);
      expect(validation2.issues).toContain(
        "Required file missing: status.json",
      );
    });
  });

  describe("Performance Integration", () => {
    it("should handle session creation under time limits", async () => {
      const questions = [
        {
          options: [{ label: "Option" }],
          prompt: "Performance test",
          title: "Performance",
        },
      ];

      const startTime = Date.now();
      const sessionId = await sessionManager.createSession(questions);
      const endTime = Date.now();

      // Session creation should be fast (under 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(sessionId).toBeDefined();
    });

    it("should handle multiple sessions efficiently", async () => {
      const questions = [
        {
          options: [{ label: "Option" }],
          prompt: "Efficiency test",
          title: "Efficiency",
        },
      ];

      const startTime = Date.now();
      const sessionIds = await Promise.all(
        Array.from({ length: 10 }, () =>
          sessionManager.createSession(questions),
        ),
      );
      const endTime = Date.now();

      // Creating 10 sessions should be fast (under 500ms)
      expect(endTime - startTime).toBeLessThan(500);
      expect(sessionIds).toHaveLength(10);

      // Verify all sessions were created correctly
      for (const sessionId of sessionIds) {
        expect(await sessionManager.sessionExists(sessionId)).toBe(true);
      }
    });
  });
});
