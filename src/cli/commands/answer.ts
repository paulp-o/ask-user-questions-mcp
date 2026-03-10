/**
 * CLI Answer Command — `auq answer <sessionId>`
 * Allows answering or rejecting sessions programmatically.
 */

import { SessionManager } from "../../session/SessionManager.js";
import type { UserAnswer } from "../../session/types.js";
import { getSessionDirectory } from "../../session/utils.js";
import { outputResult, parseFlags } from "../utils.js";

/**
 * Run the `auq answer` command.
 *
 * Usage:
 *   auq answer <sessionId> --answers '{"0": {"selectedOption": "opt1"}}'
 *   auq answer <sessionId> --reject [--reason "..."]
 *   auq answer <sessionId> --answers '...' --force   # force-answer abandoned session
 *   auq answer <sessionId> --reject --json
 */
export async function runAnswerCommand(args: string[]): Promise<void> {
  const { flags, positionals } = parseFlags(args);
  const jsonMode = flags.json === true;
  const sessionId = positionals[0];

  // ── Validate sessionId ───────────────────────────────────────────
  if (!sessionId) {
    outputResult(
      {
        success: false,
        error:
          "Missing session ID. Usage: auq answer <sessionId> --answers '{...}' | --reject [--reason \"...\"]'",
      },
      jsonMode,
    );
    process.exit(1);
    return; // unreachable, keeps TS happy
  }

  // ── Initialise SessionManager ─────────────────────────────────────
  const sessionManager = new SessionManager({
    baseDir: getSessionDirectory(),
  });
  await sessionManager.initialize();

  // ── Verify session exists ────────────────────────────────────────
  const exists = await sessionManager.sessionExists(sessionId);
  if (!exists) {
    outputResult(
      { success: false, error: `Session not found: ${sessionId}` },
      jsonMode,
    );
    process.exit(1);
    return;
  }

  // ── Check for abandoned status ───────────────────────────────────
  const status = await sessionManager.getSessionStatus(sessionId);
  if (status?.status === "abandoned" && !flags.force) {
    outputResult(
      {
        success: false,
        error:
          "Warning: AI disconnected. Use --force to answer anyway.",
      },
      jsonMode,
    );
    process.exit(1);
    return;
  }

  if (status?.status === "abandoned" && flags.force) {
    // Proceed with a warning in human-readable mode
    if (!jsonMode) {
      console.warn(
        "Warning: AI disconnected, proceeding with --force.",
      );
    }
  }

  // ── Reject path ──────────────────────────────────────────────────
  if (flags.reject) {
    const reason =
      typeof flags.reason === "string" ? flags.reason : undefined;
    await sessionManager.rejectSession(sessionId, reason);
    outputResult(
      { success: true, sessionId, status: "rejected" },
      jsonMode,
    );
    if (!jsonMode) {
      console.log(`Session ${sessionId} rejected.`);
    }
    return;
  }

  // ── Answer path ──────────────────────────────────────────────────
  const answersRaw = flags.answers;
  if (!answersRaw || typeof answersRaw !== "string") {
    outputResult(
      {
        success: false,
        error:
          "Either --answers or --reject is required. Usage: auq answer <sessionId> --answers '{...}'",
      },
      jsonMode,
    );
    process.exit(1);
    return;
  }

  // Parse the answers JSON
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(answersRaw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Answers must be a JSON object with numeric keys.");
    }
  } catch (err) {
    outputResult(
      {
        success: false,
        error: `Invalid answers JSON: ${err instanceof Error ? err.message : String(err)}`,
      },
      jsonMode,
    );
    process.exit(1);
    return;
  }

  // Read session request to get expected questions
  const request = await sessionManager.getSessionRequest(sessionId);
  if (!request) {
    outputResult(
      { success: false, error: `Session request not found: ${sessionId}` },
      jsonMode,
    );
    process.exit(1);
    return;
  }

  // Transform answers to UserAnswer[] format
  const answers: UserAnswer[] = Object.entries(parsed).map(
    ([idx, ans]) => {
      const a = ans as Record<string, unknown>;
      return {
        questionIndex: parseInt(idx, 10),
        selectedOption:
          typeof a.selectedOption === "string"
            ? a.selectedOption
            : undefined,
        selectedOptions: Array.isArray(a.selectedOptions)
          ? (a.selectedOptions as string[])
          : undefined,
        customText:
          typeof a.customText === "string" ? a.customText : undefined,
        timestamp: new Date().toISOString(),
      };
    },
  );

  // Save answers through SessionManager
  const callId = status?.callId;
  await sessionManager.saveSessionAnswers(sessionId, {
    sessionId,
    timestamp: new Date().toISOString(),
    answers,
    ...(callId && { callId }),
  });

  outputResult(
    { success: true, sessionId, status: "completed" },
    jsonMode,
  );
  if (!jsonMode) {
    console.log(`Session ${sessionId} answered successfully.`);
  }
}