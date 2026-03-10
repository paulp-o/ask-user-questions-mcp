/**
 * Integration tests for the `auq answer` CLI command.
 */

import { promises as fs } from "fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionManager } from "../../../session/SessionManager.js";
import type { Question, SessionConfig } from "../../../session/types.js";
import { runAnswerCommand } from "../answer.js";

// ── Helpers ────────────────────────────────────────────────────────────────

const testBaseDir = "/tmp/auq-test-cli-answer";

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

// Stub getSessionDirectory so the answer command always targets our temp dir.
vi.mock("../../../session/utils.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getSessionDirectory: () => testBaseDir,
  };
});

// ── Test Suite ─────────────────────────────────────────────────────────────

describe("answer command", () => {
  let sessionManager: SessionManager;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exitSpy: any;

  beforeEach(async () => {
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
    sessionManager = new SessionManager({
      baseDir: testBaseDir,
      maxSessions: 10,
      sessionTimeout: 0,
    } as SessionConfig);
    await sessionManager.initialize();

    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("process.exit"); }) as never);
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    exitSpy.mockRestore();
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
  });

  // ── Success: answer a pending session ─────────────────────────────────

  it("should answer a pending session with valid answers JSON", async () => {
    const sessionId = await sessionManager.createSession(sampleQuestions);
    const answersJson = JSON.stringify({
      "0": { selectedOption: "TypeScript" },
      "1": { selectedOption: "React" },
    });

    await runAnswerCommand([sessionId, "--answers", answersJson]);

    // Verify status is completed
    const status = await sessionManager.getSessionStatus(sessionId);
    expect(status?.status).toBe("completed");

    // Verify answers were saved
    const savedAnswers = await sessionManager.getSessionAnswers(sessionId);
    expect(savedAnswers).not.toBeNull();
    expect(savedAnswers!.answers).toHaveLength(2);
    expect(savedAnswers!.answers[0].selectedOption).toBe("TypeScript");
    expect(savedAnswers!.answers[1].selectedOption).toBe("React");
  });

  it("should write answers.json to session directory", async () => {
    const sessionId = await sessionManager.createSession(sampleQuestions);
    const answersJson = JSON.stringify({
      "0": { selectedOption: "Python" },
    });

    await runAnswerCommand([sessionId, "--answers", answersJson]);

    // Directly verify the file exists
    const answersPath = `${testBaseDir}/${sessionId}/answers.json`;
    const stat = await fs.stat(answersPath);
    expect(stat.isFile()).toBe(true);
  });

  // ── Reject path ──────────────────────────────────────────────────────

  it("should reject session with reason", async () => {
    const sessionId = await sessionManager.createSession(sampleQuestions);

    await runAnswerCommand([
      sessionId,
      "--reject",
      "--reason",
      "not applicable",
    ]);

    const status = await sessionManager.getSessionStatus(sessionId);
    expect(status?.status).toBe("rejected");
    expect(status?.rejectionReason).toBe("not applicable");
  });

  it("should reject session without reason", async () => {
    const sessionId = await sessionManager.createSession(sampleQuestions);

    await runAnswerCommand([sessionId, "--reject"]);

    const status = await sessionManager.getSessionStatus(sessionId);
    expect(status?.status).toBe("rejected");
  });

  // ── Error cases ──────────────────────────────────────────────────────

  it("should error when sessionId is missing", async () => {
    await expect(runAnswerCommand([])).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(errorOutput).toContain("Missing session ID");
  });

  it("should error when session does not exist", async () => {
    const fakeId = "00000000-0000-4000-a000-000000000000";
    await expect(
      runAnswerCommand([fakeId, "--answers", '{ "0": {} }']),
    ).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(errorOutput).toContain("Session not found");
  });

  it("should error when answers JSON is malformed", async () => {
    const sessionId = await sessionManager.createSession(sampleQuestions);

    await expect(
      runAnswerCommand([sessionId, "--answers", "not-json"]),
    ).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(errorOutput).toContain("Invalid answers JSON");
  });

  it("should error when neither --answers nor --reject is provided", async () => {
    const sessionId = await sessionManager.createSession(sampleQuestions);

    await expect(runAnswerCommand([sessionId])).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(errorOutput).toContain("Either --answers or --reject is required");
  });

  // ── Abandoned session handling ────────────────────────────────────────

  it("should warn for abandoned session without --force", async () => {
    const sessionId = await sessionManager.createSession(sampleQuestions);
    // Mark as abandoned
    await sessionManager.updateSessionStatus(sessionId, "abandoned");

    await expect(
      runAnswerCommand([
        sessionId,
        "--answers",
        JSON.stringify({ "0": { selectedOption: "TypeScript" } }),
      ]),
    ).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(errorOutput).toContain("AI disconnected");
    expect(errorOutput).toContain("--force");
  });

  it("should succeed for abandoned session with --force", async () => {
    const sessionId = await sessionManager.createSession(sampleQuestions);
    await sessionManager.updateSessionStatus(sessionId, "abandoned");

    const answersJson = JSON.stringify({
      "0": { selectedOption: "TypeScript" },
      "1": { selectedOption: "React" },
    });

    await runAnswerCommand([sessionId, "--answers", answersJson, "--force"]);

    const status = await sessionManager.getSessionStatus(sessionId);
    expect(status?.status).toBe("completed");

    // Check the warning was emitted
    const warnOutput = consoleWarnSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(warnOutput).toContain("Warning");
  });

  // ── JSON output ──────────────────────────────────────────────────────

  it("should produce valid JSON output with --json flag on answer", async () => {
    const sessionId = await sessionManager.createSession(sampleQuestions);
    const answersJson = JSON.stringify({
      "0": { selectedOption: "TypeScript" },
    });

    await runAnswerCommand([sessionId, "--answers", answersJson, "--json"]);

    // console.log should have been called with valid JSON
    const jsonOutput = consoleLogSpy.mock.calls[0][0] as string;
    const result = JSON.parse(jsonOutput);
    expect(result.success).toBe(true);
    expect(result.sessionId).toBe(sessionId);
    expect(result.status).toBe("completed");
  });

  it("should produce valid JSON output with --json flag on reject", async () => {
    const sessionId = await sessionManager.createSession(sampleQuestions);

    await runAnswerCommand([sessionId, "--reject", "--json"]);

    const jsonOutput = consoleLogSpy.mock.calls[0][0] as string;
    const result = JSON.parse(jsonOutput);
    expect(result.success).toBe(true);
    expect(result.sessionId).toBe(sessionId);
    expect(result.status).toBe("rejected");
  });

  it("should produce valid JSON error output with --json flag", async () => {
    await expect(runAnswerCommand(["--json"])).rejects.toThrow("process.exit");

    const jsonOutput = consoleLogSpy.mock.calls[0][0] as string;
    const result = JSON.parse(jsonOutput);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});