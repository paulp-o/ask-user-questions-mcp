/**
 * Integration tests for the `auq history` CLI command.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";

import { SessionManager } from "../../../session/SessionManager.js";
import type { Question } from "../../../session/types.js";
import { runHistoryCommand } from "../history.js";

// ── Test directory ─────────────────────────────────────────────────────────

const testBaseDir = `/tmp/auq-test-history-${process.pid}`;

// Stub getSessionDirectory so the history command always targets our temp dir.
vi.mock("../../../session/utils.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getSessionDirectory: () => testBaseDir,
  };
});

// ── Test fixtures ───────────────────────────────────────────────────────────

const sampleQuestions: Question[] = [
  {
    title: "Database",
    prompt: "Which database should we use?",
    options: [
      { label: "Postgres", description: "Relational, reliable" },
      { label: "Redis", description: "In-memory cache" },
    ],
    multiSelect: false,
  },
  {
    title: "Auth",
    prompt: "Which auth method?",
    options: [
      { label: "JWT", description: "Stateless tokens" },
      { label: "Cookies", description: "Server-side sessions" },
    ],
    multiSelect: false,
  },
];

async function createCompletedSession(
  mgr: SessionManager,
  opts?: { read?: boolean },
): Promise<string> {
  const id = await mgr.createSession(sampleQuestions);
  await mgr.saveSessionAnswers(id, {
    sessionId: id,
    timestamp: new Date().toISOString(),
    answers: sampleQuestions.map((q, i) => ({
      questionIndex: i,
      timestamp: new Date().toISOString(),
      selectedOption: q.options[0].label,
    })),
  });
  await mgr.updateSessionStatus(id, "completed");
  if (opts?.read) {
    await mgr.markSessionAsRead(id);
  }
  return id;
}

async function createRejectedSession(mgr: SessionManager): Promise<string> {
  const id = await mgr.createSession(sampleQuestions);
  await mgr.rejectSession(id, "not relevant");
  return id;
}

async function createAbandonedSession(mgr: SessionManager): Promise<string> {
  const id = await mgr.createSession(sampleQuestions);
  await mgr.updateSessionStatus(id, "abandoned");
  return id;
}

// ── Test Suite ──────────────────────────────────────────────────────────────

describe("history command", () => {
  let sessionManager: SessionManager;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
    sessionManager = new SessionManager({ baseDir: testBaseDir });
    await sessionManager.initialize();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exitCode = undefined;
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
  });

  // ── List (default) ──────────────────────────────────────────────────────

  describe("list (default)", () => {
    it("should list non-abandoned sessions by default", async () => {
      await createCompletedSession(sessionManager);
      const abandonedId = await createAbandonedSession(sessionManager);
      await runHistoryCommand([]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("completed");
      // Abandoned session's short ID should not appear as a table row
      expect(output).not.toContain(abandonedId.slice(0, 8));
    });

    it("should show abandoned hint when hidden", async () => {
      await createCompletedSession(sessionManager);
      await createAbandonedSession(sessionManager);
      await runHistoryCommand([]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("abandoned hidden");
      expect(output).toContain("--all");
    });

    it("should show all with --all flag", async () => {
      await createCompletedSession(sessionManager);
      const abandonedId = await createAbandonedSession(sessionManager);
      await runHistoryCommand(["--all"]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain(abandonedId.slice(0, 8));
    });

    it("should show empty state message", async () => {
      await runHistoryCommand([]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("No sessions found");
    });

    it("should limit output with --limit", async () => {
      await createCompletedSession(sessionManager);
      await createCompletedSession(sessionManager);
      await createCompletedSession(sessionManager);
      await runHistoryCommand(["--limit", "2"]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      // Match 8-character lowercase hex strings (UUID short IDs)
      const matches = output.match(/[a-f0-9]{8}/g) || [];
      const uniqueIds = [...new Set(matches)];
      expect(uniqueIds.length).toBeLessThanOrEqual(2);
    });

    it("should filter unread with --unread", async () => {
      const unreadId = await createCompletedSession(sessionManager);
      await createCompletedSession(sessionManager, { read: true });
      await runHistoryCommand(["--unread"]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain(unreadId.slice(0, 8));
    });

    it("should search with --search", async () => {
      await createCompletedSession(sessionManager);
      await runHistoryCommand(["--search", "database"]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("completed");
    });

    it("should output JSON with --json", async () => {
      await createCompletedSession(sessionManager);
      await runHistoryCommand(["--json"]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed.items)).toBe(true);
      expect(parsed.items[0]).toHaveProperty("sessionId");
      expect(parsed.items[0]).toHaveProperty("status");
      expect(parsed.items[0]).toHaveProperty("questionCount");
      expect(parsed).toHaveProperty("pagination");
      expect(parsed.pagination).toHaveProperty("page");
      expect(parsed.pagination).toHaveProperty("total");
    });
    it("should find session with --session", async () => {
      const id = await createCompletedSession(sessionManager);
      await runHistoryCommand(["--session", id.slice(0, 8)]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain(id.slice(0, 8));
    });

    it("should error for --session with no match", async () => {
      await runHistoryCommand(["--session", "00000000"]);
      expect(process.exitCode).toBe(1);
    });

    it("should paginate with --page", async () => {
      await createCompletedSession(sessionManager);
      await createCompletedSession(sessionManager);
      await createCompletedSession(sessionManager);
      await runHistoryCommand(["--limit", "2", "--page", "2", "--json"]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      const parsed = JSON.parse(output);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.pagination.page).toBe(2);
      expect(parsed.pagination.total).toBe(3);
      expect(parsed.pagination.totalPages).toBe(2);
    });
  });

  // ── Show ────────────────────────────────────────────────────────────────

  describe("show", () => {
    it("should show session details", async () => {
      const id = await createCompletedSession(sessionManager);
      await runHistoryCommand(["show", id]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain(id);
      expect(output).toContain("completed");
      expect(output).toContain("Which database should we use?");
    });

    it("should show all options with (selected) prefix for answered options", async () => {
      const id = await createCompletedSession(sessionManager);
      await runHistoryCommand(["show", id]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("(selected)");
      expect(output).toContain("Postgres");
      expect(output).toContain("Redis");
    });

    it("should resolve short session ID", async () => {
      const id = await createCompletedSession(sessionManager);
      await runHistoryCommand(["show", id.slice(0, 8)]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain(id);
    });

    it("should error for non-existent session", async () => {
      await runHistoryCommand(["show", "nonexistent-id"]);
      expect(process.exitCode).toBe(1);
    });

    it("should show rejected session", async () => {
      const id = await createRejectedSession(sessionManager);
      await runHistoryCommand(["show", id]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("rejected");
    });

    it("should show abandoned session", async () => {
      const id = await createAbandonedSession(sessionManager);
      await runHistoryCommand(["show", id]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("abandoned");
    });

    it("should output JSON with --json", async () => {
      const id = await createCompletedSession(sessionManager);
      await runHistoryCommand(["show", id, "--json"]);
      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      const parsed = JSON.parse(output);
      expect(parsed.sessionId).toBe(id);
      expect(parsed.questions).toBeInstanceOf(Array);
      expect(parsed.questions[0].options).toBeInstanceOf(Array);
    });
  });
});