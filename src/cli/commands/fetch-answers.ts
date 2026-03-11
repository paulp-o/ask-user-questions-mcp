/**
 * CLI Fetch-Answers Command — `auq fetch-answers [<session-id>] [--blocking] [--json] [--unread]`
 * Retrieves answers for a session asynchronously, or lists unread sessions.
 */

import { SessionManager } from "../../session/SessionManager.js";
import { ResponseFormatter } from "../../session/ResponseFormatter.js";
import { getSessionDirectory } from "../../session/utils.js";
import { formatAge, outputResult, parseFlags } from "../utils.js";

/**
 * Run the `auq fetch-answers` command.
 *
 * Usage:
 *   auq fetch-answers                        # list all unread sessions (default)
 *   auq fetch-answers --unread               # same as above
 *   auq fetch-answers <sessionId>            # fetch answers for specific session
 *   auq fetch-answers <sessionId> --blocking # wait until answered, then fetch
 *   auq fetch-answers <sessionId> --json     # output as JSON
 */
export async function runFetchAnswersCommand(args: string[]): Promise<void> {
  const { flags, positionals } = parseFlags(args);
  const jsonMode = flags.json === true;
  const blockingMode = flags.blocking === true;
  const unreadMode = flags.unread === true;
  const sessionIdArg = positionals[0];

  // ── Initialise SessionManager ─────────────────────────────────────
  const sessionManager = new SessionManager({
    baseDir: getSessionDirectory(),
  });
  await sessionManager.initialize();

  // ── Mode B: List unread sessions ──────────────────────────────────
  // Default (no session-id) OR explicit --unread flag
  if (!sessionIdArg || unreadMode) {
    // Guard: if --blocking was passed without a session ID, that's an error
    if (blockingMode && !sessionIdArg) {
      outputResult(
        { success: false, error: "--blocking requires a session ID.\n\nUsage:\n  auq fetch-answers <session-id> [--blocking] [--json]\n  auq fetch-answers --unread [--json]" },
        jsonMode,
      );
      process.exitCode = 1;
      return;
    }

    return listUnreadSessions(sessionManager, jsonMode);
  }

  // ── Mode A: Fetch specific session ────────────────────────────────
  return fetchSession(sessionManager, sessionIdArg, blockingMode, jsonMode);
}

// ── List Unread Sessions ──────────────────────────────────────────────

async function listUnreadSessions(
  sessionManager: SessionManager,
  jsonMode: boolean,
): Promise<void> {
  const unreadIds = await sessionManager.getUnreadSessions();

  if (jsonMode) {
    const entries = await Promise.all(
      unreadIds.map(async (sessionId) => {
        const status = await sessionManager.getSessionStatus(sessionId);
        const request = await sessionManager.getSessionRequest(sessionId);
        return {
          sessionId,
          status: status?.status ?? "unknown",
          createdAt: status?.createdAt ?? null,
          lastReadAt: null,
          questionCount: request?.questions?.length ?? status?.totalQuestions ?? 0,
        };
      }),
    );
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (unreadIds.length === 0) {
    console.log("No unread sessions.");
    return;
  }

  console.log("Unread sessions:");
  console.log("");

  // Build table rows
  const rows: Array<{ id: string; status: string; age: string; questions: number }> = [];
  for (const sessionId of unreadIds) {
    const status = await sessionManager.getSessionStatus(sessionId);
    const request = await sessionManager.getSessionRequest(sessionId);
    rows.push({
      id: sessionId.slice(0, 8),
      status: status?.status ?? "unknown",
      age: status ? formatAge(status.createdAt) : "?",
      questions: request?.questions?.length ?? status?.totalQuestions ?? 0,
    });
  }

  // Print header
  console.log("ID        Status     Age     Questions");
  for (const row of rows) {
    const id = row.id.padEnd(10);
    const status = row.status.padEnd(11);
    const age = row.age.padEnd(8);
    console.log(`${id}${status}${age}${row.questions}`);
  }
}

// ── Fetch Specific Session ────────────────────────────────────────────

async function fetchSession(
  sessionManager: SessionManager,
  sessionIdArg: string,
  blockingMode: boolean,
  jsonMode: boolean,
): Promise<void> {
  // ── Resolve session ID (full UUID or 8-char short prefix) ─────────
  let sessionId: string;

  if (sessionIdArg.length === 8) {
    // Try prefix resolution
    const allIds = await sessionManager.getAllSessionIds();
    const match = allIds.find((id) => id.startsWith(sessionIdArg));
    if (!match) {
      outputResult(
        { success: false, error: `Session not found: ${sessionIdArg}` },
        jsonMode,
      );
      process.exitCode = 1;
      return;
    }
    sessionId = match;
  } else {
    // Treat as full UUID
    const exists = await sessionManager.sessionExists(sessionIdArg);
    if (!exists) {
      outputResult(
        { success: false, error: `Session not found: ${sessionIdArg}` },
        jsonMode,
      );
      process.exitCode = 1;
      return;
    }
    sessionId = sessionIdArg;
  }

  // ── Get current status ────────────────────────────────────────────
  let status = await sessionManager.getSessionStatus(sessionId);

  if (!status) {
    outputResult(
      { success: false, error: `Could not read session data for: ${sessionId}` },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  // ── Handle blocking wait for pending/in-progress sessions ─────────
  const isPending =
    status.status === "pending" || status.status === "in-progress";

  if (isPending && blockingMode) {
    try {
      await sessionManager.waitForAnswers(sessionId);
      // Re-read status after wait
      status = await sessionManager.getSessionStatus(sessionId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === "SESSION_REJECTED") {
        // Will be handled below after re-reading status
        status = await sessionManager.getSessionStatus(sessionId);
      } else {
        outputResult(
          { success: false, error: `Error waiting for answers: ${errMsg}` },
          jsonMode,
        );
        process.exitCode = 1;
        return;
      }
    }
  }

  // Re-check status after potential wait
  const currentStatus = status?.status ?? "unknown";

  // ── Handle completed session ──────────────────────────────────────
  if (currentStatus === "completed") {
    const request = await sessionManager.getSessionRequest(sessionId);
    let answersData: Awaited<ReturnType<typeof sessionManager.getSessionAnswers>> = null;
    try {
      answersData = await sessionManager.getSessionAnswers(sessionId);
    } catch {
      // answers.json may not exist yet, treat as pending
    }

    if (!answersData || !request) {
      outputResult(
        { success: false, error: `Could not read answers for: ${sessionId}` },
        jsonMode,
      );
      process.exitCode = 1;
      return;
    }

    // Mark as read
    await sessionManager.markSessionAsRead(sessionId);
    const lastReadAt = new Date().toISOString();

    if (jsonMode) {
      console.log(
        JSON.stringify(
          {
            sessionId,
            status: "completed",
            answers: answersData.answers,
            lastReadAt,
          },
          null,
          2,
        ),
      );
      return;
    }

    const formatted = ResponseFormatter.formatUserResponse(
      answersData,
      request.questions,
      sessionId,
    );
    console.log(formatted);
    return;
  }

  // ── Handle pending/in-progress (non-blocking) ─────────────────────
  if (currentStatus === "pending" || currentStatus === "in-progress") {
    if (jsonMode) {
      console.log(
        JSON.stringify(
          { sessionId, status: currentStatus, answers: null, lastReadAt: null },
          null,
          2,
        ),
      );
      return;
    }
    console.log(ResponseFormatter.formatPendingStatus(sessionId));
    return;
  }

  // ── Handle rejected session ───────────────────────────────────────
  if (currentStatus === "rejected") {
    if (jsonMode) {
      console.log(
        JSON.stringify(
          {
            sessionId,
            status: "rejected",
            answers: null,
            lastReadAt: null,
            rejectionReason: status?.rejectionReason ?? null,
          },
          null,
          2,
        ),
      );
      return;
    }
    console.log(
      ResponseFormatter.formatRejectedStatus(sessionId, status?.rejectionReason),
    );
    return;
  }

  // ── Handle abandoned / timed_out ──────────────────────────────────
  if (jsonMode) {
    console.log(
      JSON.stringify(
        { sessionId, status: currentStatus, answers: null, lastReadAt: null },
        null,
        2,
      ),
    );
    return;
  }
  console.log(ResponseFormatter.formatSessionStatus(sessionId, currentStatus));
}