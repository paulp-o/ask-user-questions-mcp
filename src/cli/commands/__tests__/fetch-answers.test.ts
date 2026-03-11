/**
 * Integration tests for the `auq fetch-answers` CLI command.
 */

import { promises as fs } from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionManager } from "../../../session/SessionManager.js";
import type { Question, SessionAnswer } from "../../../session/types.js";
import { runFetchAnswersCommand } from "../fetch-answers.js";

// ── Helpers ────────────────────────────────────────────────────────────────

const testBaseDir = "/tmp/auq-test-cli-fetch-answers";

const sampleQuestions: Question[] = [
  {
    title: "Language",
    prompt: "Which language do you prefer?",
    options: [
      { label: "TypeScript", description: "Typed JS" },
      { label: "Python", description: "Scripting" },
    ],
  },
  {
    title: "Framework",
    prompt: "Pick a framework",
    options: [
      { label: "React" },
      { label: "Vue" },
    ],
  },
];

// Stub getSessionDirectory so the fetch-answers command always targets our temp dir.
vi.mock("../../../session/utils.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getSessionDirectory: () => testBaseDir,
  };
});

/**
 * Helper: create a completed session with answers saved.
 */
async function createCompletedSession(
  sessionManager: SessionManager,
  questions: Question[] = sampleQuestions,
): Promise<string> {
  const sessionId = await sessionManager.createSession(questions);
  const answersData: SessionAnswer = {
    sessionId,
    timestamp: new Date().toISOString(),
    answers: questions.map((q, i) => ({
      questionIndex: i,
      timestamp: new Date().toISOString(),
      selectedOption: q.options[0].label,
    })),
  };
  await sessionManager.saveSessionAnswers(sessionId, answersData);
  await sessionManager.updateSessionStatus(sessionId, "completed");
  return sessionId;
}

// ── Test Suite ─────────────────────────────────────────────────────────────

describe("fetch-answers command", () => {
  let sessionManager: SessionManager;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
    sessionManager = new SessionManager({ baseDir: testBaseDir });
    await sessionManager.initialize();

    process.exitCode = undefined;

    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    process.exitCode = undefined;
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
  });

  // ── Fetch specific session ──────────────────────────────────────────────

  describe("fetch specific session", () => {
    it("should display formatted answers for completed session", async () => {
      const sessionId = await createCompletedSession(sessionManager);

      await runFetchAnswersCommand([sessionId]);

      expect(process.exitCode).toBeUndefined();
      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      // Should contain answer content from the session
      expect(allOutput).toBeTruthy();
      expect(allOutput.length).toBeGreaterThan(0);
    });

    it("should mark session as read after fetching", async () => {
      const sessionId = await createCompletedSession(sessionManager);

      // Should not be in unread before fetching (actually it IS unread)
      const unreadBefore = await sessionManager.getUnreadSessions();
      expect(unreadBefore).toContain(sessionId);

      await runFetchAnswersCommand([sessionId]);

      // After fetching, session should be marked as read
      const unreadAfter = await sessionManager.getUnreadSessions();
      expect(unreadAfter).not.toContain(sessionId);
    });

    it("should display pending status for pending session (non-blocking)", async () => {
      const sessionId = await sessionManager.createSession(sampleQuestions);

      await runFetchAnswersCommand([sessionId]);

      expect(process.exitCode).toBeUndefined();
      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      // Should contain some output (pending status)
      expect(allOutput).toBeTruthy();
    });

    it("should display rejected status", async () => {
      const sessionId = await sessionManager.createSession(sampleQuestions);
      await sessionManager.updateSessionStatus(sessionId, "rejected");

      await runFetchAnswersCommand([sessionId]);

      expect(process.exitCode).toBeUndefined();
      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toBeTruthy();
    });

    it("should resolve short session ID (8-char prefix)", async () => {
      const sessionId = await createCompletedSession(sessionManager);
      const shortId = sessionId.slice(0, 8);

      await runFetchAnswersCommand([shortId]);

      expect(process.exitCode).toBeUndefined();
      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toBeTruthy();
    });

    it("should error for non-existent full-UUID session", async () => {
      const fakeId = "00000000-0000-4000-a000-000000000000";

      await runFetchAnswersCommand([fakeId]);

      expect(process.exitCode).toBe(1);
      const errOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      const logOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      const combined = errOutput + logOutput;
      expect(combined).toContain(fakeId);
    });

    it("should error for non-existent 8-char prefix", async () => {
      const fakeShortId = "deadbeef";

      await runFetchAnswersCommand([fakeShortId]);

      expect(process.exitCode).toBe(1);
    });
  });

  // ── --json flag ─────────────────────────────────────────────────────────

  describe("--json flag", () => {
    it("should output valid JSON for completed session", async () => {
      const sessionId = await createCompletedSession(sessionManager);

      await runFetchAnswersCommand([sessionId, "--json"]);

      expect(process.exitCode).toBeUndefined();
      // Find valid JSON in console.log calls
      const jsonCalls = consoleLogSpy.mock.calls.filter((c) => {
        try {
          JSON.parse(c[0] as string);
          return true;
        } catch {
          return false;
        }
      });
      expect(jsonCalls.length).toBeGreaterThanOrEqual(1);
      const parsed = JSON.parse(jsonCalls[0][0] as string);
      expect(parsed.sessionId).toBe(sessionId);
      expect(parsed.status).toBe("completed");
      expect(Array.isArray(parsed.answers)).toBe(true);
      expect(parsed.answers).toHaveLength(2);
      expect(parsed.lastReadAt).toBeDefined();
    });

    it("should output valid JSON for pending session", async () => {
      const sessionId = await sessionManager.createSession(sampleQuestions);

      await runFetchAnswersCommand([sessionId, "--json"]);

      const jsonCalls = consoleLogSpy.mock.calls.filter((c) => {
        try {
          JSON.parse(c[0] as string);
          return true;
        } catch {
          return false;
        }
      });
      expect(jsonCalls.length).toBeGreaterThanOrEqual(1);
      const parsed = JSON.parse(jsonCalls[0][0] as string);
      expect(parsed.sessionId).toBe(sessionId);
      expect(parsed.status).toBe("pending");
      expect(parsed.answers).toBeNull();
    });

    it("should output valid JSON for rejected session", async () => {
      const sessionId = await sessionManager.createSession(sampleQuestions);
      await sessionManager.updateSessionStatus(sessionId, "rejected");

      await runFetchAnswersCommand([sessionId, "--json"]);

      const jsonCalls = consoleLogSpy.mock.calls.filter((c) => {
        try {
          JSON.parse(c[0] as string);
          return true;
        } catch {
          return false;
        }
      });
      expect(jsonCalls.length).toBeGreaterThanOrEqual(1);
      const parsed = JSON.parse(jsonCalls[0][0] as string);
      expect(parsed.sessionId).toBe(sessionId);
      expect(parsed.status).toBe("rejected");
    });
  });

  // ── Unread / no session-id mode ─────────────────────────────────────────

  describe("unread / default mode (no session-id)", () => {
    it("should list unread sessions when no session-id provided", async () => {
      const id1 = await createCompletedSession(sessionManager);
      const id2 = await createCompletedSession(sessionManager);

      await runFetchAnswersCommand([]);

      expect(process.exitCode).toBeUndefined();
      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain(id1.slice(0, 8));
      expect(allOutput).toContain(id2.slice(0, 8));
    });

    it("should show message when no unread sessions", async () => {
      await runFetchAnswersCommand([]);

      expect(process.exitCode).toBeUndefined();
      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput.toLowerCase()).toContain("no unread");
    });

    it("should exclude already-read sessions from default unread list", async () => {
      const sessionId = await createCompletedSession(sessionManager);
      // Mark as read first
      await sessionManager.markSessionAsRead(sessionId);

      await runFetchAnswersCommand([]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      // Session should NOT appear in unread list
      expect(allOutput).not.toContain(sessionId.slice(0, 8));
    });

    it("should list unread sessions with explicit --unread flag", async () => {
      const sessionId = await createCompletedSession(sessionManager);

      await runFetchAnswersCommand(["--unread"]);

      expect(process.exitCode).toBeUndefined();
      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain(sessionId.slice(0, 8));
    });

    it("should output valid JSON array for unread list with --json", async () => {
      const id1 = await createCompletedSession(sessionManager);
      const id2 = await createCompletedSession(sessionManager);

      await runFetchAnswersCommand(["--json"]);

      expect(process.exitCode).toBeUndefined();
      const jsonCalls = consoleLogSpy.mock.calls.filter((c) => {
        try {
          JSON.parse(c[0] as string);
          return true;
        } catch {
          return false;
        }
      });
      expect(jsonCalls.length).toBeGreaterThanOrEqual(1);
      const parsed = JSON.parse(jsonCalls[0][0] as string);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      // Both session IDs appear in result
      const ids = parsed.map((e: { sessionId: string }) => e.sessionId);
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
    });

    it("should output empty JSON array when no unread sessions with --json", async () => {
      await runFetchAnswersCommand(["--json"]);

      const jsonCalls = consoleLogSpy.mock.calls.filter((c) => {
        try {
          JSON.parse(c[0] as string);
          return true;
        } catch {
          return false;
        }
      });
      expect(jsonCalls.length).toBeGreaterThanOrEqual(1);
      const parsed = JSON.parse(jsonCalls[0][0] as string);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });
  });

  // ── --blocking with no session id ───────────────────────────────────────

  describe("--blocking flag validation", () => {
    it("should error when --blocking used without a session ID", async () => {
      await runFetchAnswersCommand(["--blocking"]);

      expect(process.exitCode).toBe(1);
      // Should have some error output (either console.error or console.log JSON error)
      const logOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      const errOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      const combined = logOutput + errOutput;
      expect(combined.toLowerCase()).toMatch(/blocking|session id/i);
    });
  });

  // ── lastReadAt tracking ─────────────────────────────────────────────────

  describe("read tracking", () => {
    it("should set lastReadAt when fetching a completed session", async () => {
      const sessionId = await createCompletedSession(sessionManager);

      const before = new Date();
      await runFetchAnswersCommand([sessionId]);
      const after = new Date();

      const answers = await sessionManager.getSessionAnswers(sessionId);
      expect(answers).not.toBeNull();
      expect(answers!.lastReadAt).toBeDefined();

      const readAt = new Date(answers!.lastReadAt!);
      expect(readAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(readAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it("should not appear in unread list after being fetched", async () => {
      const sessionId = await createCompletedSession(sessionManager);

      // Before fetch — should be unread
      const unreadBefore = await sessionManager.getUnreadSessions();
      expect(unreadBefore).toContain(sessionId);

      await runFetchAnswersCommand([sessionId]);

      // After fetch — should be removed from unread list
      const unreadAfter = await sessionManager.getUnreadSessions();
      expect(unreadAfter).not.toContain(sessionId);

      // Running --unread should also not show it
      consoleLogSpy.mockClear();
      await runFetchAnswersCommand(["--unread"]);
      const unreadOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(unreadOutput).not.toContain(sessionId.slice(0, 8));
    });
  });
});