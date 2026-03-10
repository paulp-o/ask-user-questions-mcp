/**
 * Tests for AbortSignal and disconnect handling in SessionManager
 */

import { promises as fs } from "fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Question } from "../session/types.js";

import { SessionManager } from "../session/index.js";

const testQuestions: Question[] = [
  {
    options: [
      { description: "Dynamic language", label: "JavaScript" },
      { description: "Static typing", label: "TypeScript" },
    ],
    prompt: "Which programming language do you prefer?",
    title: "Language",
  },
];

describe("AbortSignal and Disconnect Handling", () => {
  let sessionManager: SessionManager;
  const testBaseDir = "/tmp/auq-test-abort";

  beforeEach(async () => {
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
    sessionManager = new SessionManager({
      baseDir: testBaseDir,
      maxSessions: 10,
      sessionTimeout: 5000,
    });
    await sessionManager.initialize();
  });

  afterEach(async () => {
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
  });

  describe("waitForAnswers with AbortSignal", () => {
    it("should throw ABORTED when signal fires during polling", async () => {
      const sessionId = await sessionManager.createSession(testQuestions);
      const controller = new AbortController();

      // Abort after a short delay
      setTimeout(() => controller.abort(), 100);

      await expect(
        sessionManager.waitForAnswers(sessionId, 0, undefined, controller.signal),
      ).rejects.toThrow("ABORTED");
    });

    it("should throw ABORTED immediately when signal is already aborted", async () => {
      const sessionId = await sessionManager.createSession(testQuestions);
      const controller = new AbortController();
      controller.abort(); // Pre-abort

      await expect(
        sessionManager.waitForAnswers(sessionId, 0, undefined, controller.signal),
      ).rejects.toThrow("ABORTED");
    });

    it("should work normally when signal is never aborted", async () => {
      const sessionId = await sessionManager.createSession(testQuestions);
      const controller = new AbortController();

      // Write answers after a short delay
      setTimeout(async () => {
        await sessionManager.saveSessionAnswers(sessionId, {
          answers: [{ questionIndex: 0, selectedOption: "JavaScript", timestamp: new Date().toISOString() }],
          timestamp: new Date().toISOString(),
          sessionId,
        });
      }, 100);

      const result = await sessionManager.waitForAnswers(
        sessionId,
        5000,
        undefined,
        controller.signal,
      );
      expect(result).toBe(sessionId);
    });
  });

  describe("startSession with AbortSignal", () => {
    it("should throw ABORTED when pre-aborted signal is passed", async () => {
      const controller = new AbortController();
      controller.abort(); // Pre-abort

      await expect(
        sessionManager.startSession(testQuestions, "test-call", undefined, controller.signal),
      ).rejects.toThrow("ABORTED");
    });

    it("should mark session as abandoned when pre-aborted signal is passed", async () => {
      const controller = new AbortController();
      controller.abort(); // Pre-abort

      try {
        await sessionManager.startSession(testQuestions, "test-call", undefined, controller.signal);
      } catch {
        // Expected error
      }

      // Get session IDs and check the last one's status
      const sessionIds = await sessionManager.getAllSessionIds();
      expect(sessionIds.length).toBeGreaterThan(0);

      const lastSessionId = sessionIds[sessionIds.length - 1];
      const status = await sessionManager.getSessionStatus(lastSessionId);
      expect(status?.status).toBe("abandoned");
    });

    it("should mark session as abandoned when signal aborts during wait", async () => {
      const controller = new AbortController();

      // Abort after session is created but before answers arrive
      setTimeout(() => controller.abort(), 200);

      await expect(
        sessionManager.startSession(testQuestions, "test-call", undefined, controller.signal),
      ).rejects.toThrow("ABORTED");

      // Verify session was marked abandoned
      const sessionIds = await sessionManager.getAllSessionIds();
      expect(sessionIds.length).toBeGreaterThan(0);

      const lastSessionId = sessionIds[sessionIds.length - 1];

      // Give abort handler time to update status
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = await sessionManager.getSessionStatus(lastSessionId);
      expect(status?.status).toBe("abandoned");
    });

    it("should clean up abort handler after successful completion", async () => {
      const controller = new AbortController();
      const signal = controller.signal;

      // Create a session and immediately provide answers
      const sessionPromise = sessionManager.startSession(
        testQuestions,
        "test-call",
        undefined,
        signal,
      );

      // Write answers quickly
      // First we need to get the session ID, but startSession creates it internally
      // We'll poll for any pending session
      await new Promise((resolve) => setTimeout(resolve, 100));
      const sessionIds = await sessionManager.getAllSessionIds();
      if (sessionIds.length > 0) {
        const lastSessionId = sessionIds[sessionIds.length - 1];
        await sessionManager.saveSessionAnswers(lastSessionId, {
          answers: [{ questionIndex: 0, selectedOption: "JavaScript", timestamp: new Date().toISOString() }],
          timestamp: new Date().toISOString(),
          sessionId: lastSessionId,
        });
      }

      const result = await sessionPromise;
      expect(result.formattedResponse).toBeDefined();
      expect(result.sessionId).toBeDefined();

      // After successful completion, aborting should have no effect
      // (handler was cleaned up)
      controller.abort();

      // Session should still be completed, not abandoned
      const status = await sessionManager.getSessionStatus(result.sessionId);
      expect(status?.status).toBe("completed");
    });
  });

  describe("createAskUserQuestionsCore with abort support", () => {
    it("should expose markAbandoned method", async () => {
      const { createAskUserQuestionsCore } = await import(
        "../core/ask-user-questions.js"
      );
      const core = createAskUserQuestionsCore({
        baseDir: testBaseDir,
        sessionManager,
      });

      expect(core.markAbandoned).toBeDefined();
      expect(typeof core.markAbandoned).toBe("function");
    });

    it("should mark session as abandoned via markAbandoned", async () => {
      const { createAskUserQuestionsCore } = await import(
        "../core/ask-user-questions.js"
      );
      const core = createAskUserQuestionsCore({
        baseDir: testBaseDir,
        sessionManager,
      });

      const sessionId = await sessionManager.createSession(testQuestions);

      await core.markAbandoned(sessionId);

      const status = await sessionManager.getSessionStatus(sessionId);
      expect(status?.status).toBe("abandoned");
    });

    it("should pass signal through ask to startSession", async () => {
      const { createAskUserQuestionsCore } = await import(
        "../core/ask-user-questions.js"
      );
      const core = createAskUserQuestionsCore({
        baseDir: testBaseDir,
        sessionManager,
      });
      await core.ensureInitialized();

      const controller = new AbortController();
      controller.abort(); // Pre-abort

      await expect(
        core.ask(
          [
            {
              options: [
                { description: "Dynamic language", label: "JavaScript" },
                { description: "Static typing", label: "TypeScript" },
              ],
              prompt: "Which programming language do you prefer?",
              title: "Language",
              multiSelect: false,
            },
          ],
          "test-call",
          undefined,
          controller.signal,
        ),
      ).rejects.toThrow("ABORTED");
    });
  });

  describe("activeRequests tracking (server integration)", () => {
    it("should track and clean up active requests via Map", () => {
      // Unit test for the activeRequests Map pattern used in server.ts
      const activeRequests = new Map<
        string,
        { controller: AbortController; sessionId?: string }
      >();

      const controller = new AbortController();
      const callId = "test-call-id";

      // Track request
      activeRequests.set(callId, { controller });
      expect(activeRequests.size).toBe(1);

      // Update with sessionId
      const entry = activeRequests.get(callId);
      expect(entry).toBeDefined();
      entry!.sessionId = "test-session-id";

      // Verify update
      expect(activeRequests.get(callId)?.sessionId).toBe("test-session-id");

      // Simulate disconnect - abort and clean up
      for (const [id, e] of activeRequests.entries()) {
        e.controller.abort();
        activeRequests.delete(id);
      }

      expect(activeRequests.size).toBe(0);
      expect(controller.signal.aborted).toBe(true);
    });

    it("should handle multiple concurrent requests on disconnect", () => {
      const activeRequests = new Map<
        string,
        { controller: AbortController; sessionId?: string }
      >();

      // Track multiple requests
      const controllers: AbortController[] = [];
      for (let i = 0; i < 3; i++) {
        const controller = new AbortController();
        controllers.push(controller);
        activeRequests.set(`call-${i}`, {
          controller,
          sessionId: `session-${i}`,
        });
      }

      expect(activeRequests.size).toBe(3);

      // Simulate disconnect
      for (const [callId, entry] of activeRequests.entries()) {
        entry.controller.abort();
        activeRequests.delete(callId);
      }

      expect(activeRequests.size).toBe(0);
      controllers.forEach((c) => expect(c.signal.aborted).toBe(true));
    });
  });
});
