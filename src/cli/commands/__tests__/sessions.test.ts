import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";

import { runSessionsCommand } from "../sessions.js";
import { SessionManager } from "../../../session/SessionManager.js";

const TEST_BASE_DIR = "/tmp/auq-test-cli-sessions";
const TEST_ARCHIVE_DIR = "/tmp/auq-test-cli-sessions-archive";

/**
 * Helper: create a session with a given createdAt timestamp
 */
async function createTestSession(
  manager: SessionManager,
  opts: {
    createdAt?: string;
    status?: string;
    questionCount?: number;
  } = {},
): Promise<string> {
  const questionCount = opts.questionCount ?? 1;
  const questions = Array.from({ length: questionCount }, (_, i) => ({
    title: `Q${i}`,
    prompt: `Question ${i}?`,
    options: [
      { label: "A", description: "Option A" },
      { label: "B", description: "Option B" },
    ],
  }));

  const sessionId = await manager.createSession(questions);

  // Patch createdAt if requested
  if (opts.createdAt) {
    const status = await manager.getSessionStatus(sessionId);
    if (status) {
      await manager.updateSessionStatus(sessionId, status.status, {
        createdAt: opts.createdAt,
      });
    }
  }

  // Transition status if requested
  if (opts.status && opts.status !== "pending") {
    await manager.updateSessionStatus(
      sessionId,
      opts.status as any,
    );
  }

  return sessionId;
}

describe("sessions command", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let sessionManager: SessionManager;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    // Clean up test dirs
    await fs.rm(TEST_BASE_DIR, { force: true, recursive: true });
    await fs.rm(TEST_ARCHIVE_DIR, { force: true, recursive: true });

    // Point to test directories
    process.env.AUQ_SESSION_DIR = TEST_BASE_DIR;
    process.env.XDG_DATA_HOME = "/tmp/auq-test-cli-sessions-archive";

    process.exitCode = undefined;

    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Create a SessionManager for setting up test fixtures
    sessionManager = new SessionManager({ baseDir: TEST_BASE_DIR });
    await sessionManager.initialize();
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.restoreAllMocks();
    process.exitCode = undefined;
    process.env = { ...originalEnv };

    // Clean up
    await fs.rm(TEST_BASE_DIR, { force: true, recursive: true }).catch(() => {});
    await fs.rm(TEST_ARCHIVE_DIR, { force: true, recursive: true }).catch(() => {});
  });

  // ── Sessions List ─────────────────────────────────────────────────

  describe("sessions list", () => {
    it("should list pending sessions by default", async () => {
      const id1 = await createTestSession(sessionManager);
      const id2 = await createTestSession(sessionManager, {
        status: "completed",
      });

      await runSessionsCommand(["list"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain(id1);
      expect(allOutput).not.toContain(id2);
    });

    it("should show empty message when no sessions", async () => {
      await runSessionsCommand(["list"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("No sessions found");
    });

    it("should list in-progress sessions with default filter", async () => {
      const id1 = await createTestSession(sessionManager, {
        status: "in-progress",
      });

      await runSessionsCommand(["list"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain(id1);
    });

    it("should show only stale sessions with --stale flag", async () => {
      // Create a stale session (3 hours ago)
      const threeHoursAgo = new Date(
        Date.now() - 3 * 60 * 60 * 1000,
      ).toISOString();
      const staleId = await createTestSession(sessionManager, {
        createdAt: threeHoursAgo,
      });

      // Create a fresh session
      const freshId = await createTestSession(sessionManager);

      await runSessionsCommand(["list", "--stale"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain(staleId);
      expect(allOutput).not.toContain(freshId);
    });

    it("should show all sessions with --all flag", async () => {
      const pendingId = await createTestSession(sessionManager);
      const completedId = await createTestSession(sessionManager, {
        status: "completed",
      });
      const abandonedId = await createTestSession(sessionManager, {
        status: "abandoned",
      });

      await runSessionsCommand(["list", "--all"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain(pendingId);
      expect(allOutput).toContain(completedId);
      expect(allOutput).toContain(abandonedId);
    });

    it("should show --pending as same as default", async () => {
      const pendingId = await createTestSession(sessionManager);
      const completedId = await createTestSession(sessionManager, {
        status: "completed",
      });

      await runSessionsCommand(["list", "--pending"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain(pendingId);
      expect(allOutput).not.toContain(completedId);
    });

    it("should sort sessions newest first", async () => {
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();
      const oneHourAgo = new Date(
        Date.now() - 1 * 60 * 60 * 1000,
      ).toISOString();

      const oldId = await createTestSession(sessionManager, {
        createdAt: twoHoursAgo,
      });
      const newId = await createTestSession(sessionManager, {
        createdAt: oneHourAgo,
      });

      await runSessionsCommand(["list"]);

      // Find which order they appear in output
      const calls = consoleLogSpy.mock.calls.map((c) => String(c[0]));
      const oldIdx = calls.findIndex((c) => c.includes(oldId));
      const newIdx = calls.findIndex((c) => c.includes(newId));

      expect(newIdx).toBeLessThan(oldIdx);
    });

    it("should show stale indicator for stale sessions", async () => {
      const threeHoursAgo = new Date(
        Date.now() - 3 * 60 * 60 * 1000,
      ).toISOString();
      const staleId = await createTestSession(sessionManager, {
        createdAt: threeHoursAgo,
      });

      await runSessionsCommand(["list"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("\u26a0");
    });

    it("should output paginated JSON with --json flag", async () => {
      const id = await createTestSession(sessionManager, {
        questionCount: 3,
      });

      await runSessionsCommand(["list", "--json"]);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);

      expect(Array.isArray(parsed.items)).toBe(true);
      expect(parsed.items.length).toBe(1);
      expect(parsed.items[0].sessionId).toBe(id);
      expect(parsed.items[0].status).toBe("pending");
      expect(parsed.items[0].createdAt).toBeDefined();
      expect(parsed.items[0].age).toBeDefined();
      expect(typeof parsed.items[0].stale).toBe("boolean");
      expect(parsed.items[0].questionCount).toBe(3);
      expect(parsed.pagination).toBeDefined();
      expect(parsed.pagination.total).toBe(1);
      expect(parsed.pagination.page).toBe(1);
    });

    it("should paginate with --limit and --page flags", async () => {
      for (let i = 0; i < 5; i++) {
        await createTestSession(sessionManager);
      }

      await runSessionsCommand(["list", "--limit", "2", "--page", "1"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("Page 1 of 3");
      const entryLines = consoleLogSpy.mock.calls
        .map((c) => c[0] as string)
        .filter((l) => l.includes("questions:"));
      expect(entryLines.length).toBe(2);
    });

    it("should show page 2 with --limit and --page flags", async () => {
      for (let i = 0; i < 5; i++) {
        await createTestSession(sessionManager);
      }

      await runSessionsCommand(["list", "--limit", "2", "--page", "2"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("Page 2 of 3");
      const entryLines = consoleLogSpy.mock.calls
        .map((c) => c[0] as string)
        .filter((l) => l.includes("questions:"));
      expect(entryLines.length).toBe(2);
    });

    it("should include pagination footer in terminal output", async () => {
      await createTestSession(sessionManager);

      await runSessionsCommand(["list"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("Page 1 of 1");
      expect(allOutput).toContain("1 total");
    });

    it("should include question count in output", async () => {
      await createTestSession(sessionManager, {
        questionCount: 5,
      });

      await runSessionsCommand(["list"]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("questions: 5");
    });
  });

  // ── Sessions Dismiss ──────────────────────────────────────────────

  describe("sessions dismiss", () => {
    it("should dismiss a stale session successfully", async () => {
      const threeHoursAgo = new Date(
        Date.now() - 3 * 60 * 60 * 1000,
      ).toISOString();
      const sessionId = await createTestSession(sessionManager, {
        createdAt: threeHoursAgo,
      });

      await runSessionsCommand(["dismiss", sessionId]);

      expect(process.exitCode).toBeUndefined();
      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("dismissed");
      expect(allOutput).toContain("archived");
    });

    it("should archive files to correct directory", async () => {
      const threeHoursAgo = new Date(
        Date.now() - 3 * 60 * 60 * 1000,
      ).toISOString();
      const sessionId = await createTestSession(sessionManager, {
        createdAt: threeHoursAgo,
      });

      await runSessionsCommand(["dismiss", sessionId]);

      // Check archive directory contains files
      const archiveDir = join(TEST_ARCHIVE_DIR, "auq", "archive", sessionId);
      const archivedFiles = await fs.readdir(archiveDir);
      expect(archivedFiles.length).toBeGreaterThan(0);
      expect(archivedFiles).toContain("status.json");
      expect(archivedFiles).toContain("request.json");
    });

    it("should remove session from active directory after dismiss", async () => {
      const threeHoursAgo = new Date(
        Date.now() - 3 * 60 * 60 * 1000,
      ).toISOString();
      const sessionId = await createTestSession(sessionManager, {
        createdAt: threeHoursAgo,
      });

      await runSessionsCommand(["dismiss", sessionId]);

      // Session should no longer exist in active
      const exists = await sessionManager.sessionExists(sessionId);
      expect(exists).toBe(false);
    });

    it("should error on non-stale session without --force", async () => {
      const sessionId = await createTestSession(sessionManager);

      await runSessionsCommand(["dismiss", sessionId]);

      expect(process.exitCode).toBe(1);
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("not stale");
    });

    it("should dismiss non-stale session with --force", async () => {
      const sessionId = await createTestSession(sessionManager);

      await runSessionsCommand(["dismiss", sessionId, "--force"]);

      expect(process.exitCode).toBeUndefined();
      const exists = await sessionManager.sessionExists(sessionId);
      expect(exists).toBe(false);
    });

    it("should error on non-existent session", async () => {
      const fakeId = "00000000-0000-4000-a000-000000000000";

      await runSessionsCommand(["dismiss", fakeId]);

      expect(process.exitCode).toBe(1);
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("not found");
    });

    it("should error when sessionId is missing", async () => {
      await runSessionsCommand(["dismiss"]);

      expect(process.exitCode).toBe(1);
      const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("Missing session ID");
    });

    it("should output valid JSON with --json flag", async () => {
      const threeHoursAgo = new Date(
        Date.now() - 3 * 60 * 60 * 1000,
      ).toISOString();
      const sessionId = await createTestSession(sessionManager, {
        createdAt: threeHoursAgo,
      });

      await runSessionsCommand(["dismiss", sessionId, "--json"]);

      expect(consoleLogSpy).toHaveBeenCalled();
      // Find the JSON output (outputResult uses console.log)
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
      expect(parsed.success).toBe(true);
      expect(parsed.sessionId).toBe(sessionId);
      expect(parsed.archivedTo).toBeDefined();
      expect(parsed.archivedTo).toContain(sessionId);
    });
  });

  // ── Sessions help ─────────────────────────────────────────────────

  describe("sessions help", () => {
    it("should show usage help when no subcommand provided", async () => {
      await runSessionsCommand([]);

      const allOutput = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(allOutput).toContain("Usage");
    });

    it("should set exitCode for unknown subcommand", async () => {
      await runSessionsCommand(["unknown"]);

      expect(process.exitCode).toBe(1);
    });
  });
});