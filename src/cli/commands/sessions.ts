/**
 * CLI Sessions Command — `auq sessions list` and `auq sessions dismiss`
 * Manages listing and dismissing/archiving sessions.
 */

import { promises as fs } from "fs";
import { join } from "path";

import { SessionManager } from "../../session/SessionManager.js";
import { getSessionDirectory } from "../../session/utils.js";
import { loadConfig } from "../../config/ConfigLoader.js";
import {
  formatAge,
  outputResult,
  parseFlags,
  resolveArchiveDirectory,
} from "../utils.js";

// ── Sessions List ──────────────────────────────────────────────────

interface SessionListEntry {
  sessionId: string;
  status: string;
  createdAt: string;
  age: string;
  stale: boolean;
  questionCount: number;
}

async function sessionsList(args: string[]): Promise<void> {
  const { flags } = parseFlags(args);
  const jsonMode = flags.json === true;
  const filterStale = flags.stale === true;
  const filterAll = flags.all === true;
  // --pending is same as default

  // Initialise SessionManager
  const sessionManager = new SessionManager({
    baseDir: getSessionDirectory(),
  });
  await sessionManager.initialize();

  // Load staleThreshold from config
  const config = loadConfig();
  const staleThreshold = config.staleThreshold ?? 7200000;

  // Get all session IDs
  const sessionIds = await sessionManager.getAllSessionIds();

  // Build entries
  const entries: SessionListEntry[] = [];

  for (const sessionId of sessionIds) {
    const status = await sessionManager.getSessionStatus(sessionId);
    if (!status) continue;

    const createdAt = status.createdAt;
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const stale = ageMs > staleThreshold;
    const age = formatAge(createdAt);

    const isPending =
      status.status === "pending" || status.status === "in-progress";

    // Apply filter
    if (filterAll) {
      // Show all statuses
    } else if (filterStale) {
      // Only stale sessions that are pending/in-progress
      if (!isPending || !stale) continue;
    } else {
      // Default / --pending: only pending/in-progress
      if (!isPending) continue;
    }

    const request = await sessionManager.getSessionRequest(sessionId);
    const questionCount = request?.questions?.length ?? status.totalQuestions ?? 0;

    entries.push({
      sessionId,
      status: status.status,
      createdAt,
      age,
      stale,
      questionCount,
    });
  }

  // Sort by createdAt descending (newest first)
  entries.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Output
  if (jsonMode) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (entries.length === 0) {
    console.log("No sessions found.");
    return;
  }

  for (const entry of entries) {
    const staleIndicator = entry.stale ? " ⚠" : "";
    console.log(
      `${entry.sessionId}  ${entry.status}  ${entry.age}  questions: ${entry.questionCount}${staleIndicator}`,
    );
  }
}

// ── Sessions Dismiss ───────────────────────────────────────────────

async function sessionsDismiss(args: string[]): Promise<void> {
  const { flags, positionals } = parseFlags(args);
  const jsonMode = flags.json === true;
  const force = flags.force === true;
  const sessionId = positionals[0];

  // ── Validate sessionId ──────────────────────────────────────────
  if (!sessionId) {
    outputResult(
      {
        success: false,
        error:
          "Missing session ID. Usage: auq sessions dismiss <sessionId> [--force] [--json]",
      },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  // ── Initialise SessionManager ───────────────────────────────────
  const sessionManager = new SessionManager({
    baseDir: getSessionDirectory(),
  });
  await sessionManager.initialize();

  // ── Verify session exists ──────────────────────────────────────
  const exists = await sessionManager.sessionExists(sessionId);
  if (!exists) {
    outputResult(
      { success: false, error: `Session not found: ${sessionId}` },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  // ── Check stale status ─────────────────────────────────────────
  const status = await sessionManager.getSessionStatus(sessionId);
  const config = loadConfig();
  const staleThreshold = config.staleThreshold ?? 7200000;
  const ageMs = status
    ? Date.now() - new Date(status.createdAt).getTime()
    : 0;
  const isStale = ageMs > staleThreshold;

  if (!isStale && !force) {
    outputResult(
      {
        success: false,
        error:
          "Session is not stale. Use --force to dismiss anyway.",
      },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  // ── Archive session ────────────────────────────────────────────
  const archiveBase = resolveArchiveDirectory();
  const archiveDir = join(archiveBase, sessionId);
  await fs.mkdir(archiveDir, { recursive: true });

  // Copy all files from session directory to archive
  const sessionDir = join(getSessionDirectory(), sessionId);
  const files = await fs.readdir(sessionDir);
  for (const file of files) {
    await fs.copyFile(join(sessionDir, file), join(archiveDir, file));
  }

  // ── Remove from active ─────────────────────────────────────────
  await sessionManager.deleteSession(sessionId);

  // ── Output ──────────────────────────────────────────────────────
  outputResult(
    { success: true, sessionId, archivedTo: archiveDir },
    jsonMode,
  );
  if (!jsonMode) {
    console.log(`Session ${sessionId} dismissed and archived to ${archiveDir}.`);
  }
}

// ── Sessions Command Dispatcher ────────────────────────────────────

export async function runSessionsCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case "list":
      return sessionsList(args.slice(1));
    case "dismiss":
      return sessionsDismiss(args.slice(1));
    default:
      console.log("Usage: auq sessions <subcommand>", "\n");
      console.log("Subcommands:");
      console.log(
        "  list [--pending|--stale|--all] [--json]  List sessions",
      );
      console.log(
        "  dismiss <sessionId> [--force] [--json]    Dismiss/archive a session",
      );
      console.log("");
      console.log("Examples:");
      console.log("  auq sessions list");
      console.log("  auq sessions list --stale --json");
      console.log("  auq sessions dismiss <sessionId>");
      console.log("  auq sessions dismiss <sessionId> --force");
      if (subcommand !== undefined) {
        process.exitCode = 1;
      }
      break;
  }
}