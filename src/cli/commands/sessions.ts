/**
 * CLI Sessions Command — `auq sessions list`, `auq sessions show`, and `auq sessions dismiss`
 * Manages listing, viewing, and dismissing/archiving sessions.
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

// ── Sessions Show ─────────────────────────────────────────────────

async function sessionsShow(args: string[]): Promise<void> {
  const { flags, positionals } = parseFlags(args);
  const jsonMode = flags.json === true;
  const sessionId = positionals[0];

  // ── Validate sessionId ──────────────────────────────────────────
  if (!sessionId) {
    outputResult(
      {
        success: false,
        error:
          "Missing session ID. Usage: auq sessions show <sessionId> [--json]",
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

  // ── Fetch session data ──────────────────────────────────────────
  const status = await sessionManager.getSessionStatus(sessionId);
  const request = await sessionManager.getSessionRequest(sessionId);
  const answersData = await sessionManager.getSessionAnswers(sessionId);

  if (!status || !request) {
    outputResult(
      { success: false, error: `Could not read session data for: ${sessionId}` },
      jsonMode,
    );
    process.exitCode = 1;
    return;
  }

  const questions = request.questions;
  const answers = answersData?.answers ?? null;

  // ── Build answer lookup (questionIndex → UserAnswer) ────────────
  const answerMap = new Map<number, { selectedOption?: string; selectedOptions?: string[]; customText?: string }>();
  if (answers) {
    for (const a of answers) {
      answerMap.set(a.questionIndex, {
        selectedOption: a.selectedOption,
        selectedOptions: a.selectedOptions,
        customText: a.customText,
      });
    }
  }

  // ── JSON output ─────────────────────────────────────────────────
  if (jsonMode) {
    const result = {
      sessionId,
      status: status.status,
      createdAt: status.createdAt,
      totalQuestions: questions.length,
      questions: questions.map((q, i) => ({
        index: i,
        prompt: q.prompt,
        title: q.title,
        multiSelect: q.multiSelect ?? false,
        options: q.options.map((o) => ({
          label: o.label,
          ...(o.description ? { description: o.description } : {}),
        })),
      })),
      answers: answers
        ? answers.map((a) => ({
            questionIndex: a.questionIndex,
            selectedOption: a.selectedOption ?? null,
            selectedOptions: a.selectedOptions ?? null,
            customText: a.customText ?? null,
            timestamp: a.timestamp,
          }))
        : null,
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // ── Human-readable output ───────────────────────────────────────
  const age = formatAge(status.createdAt);

  console.log(`Session: ${sessionId}`);
  console.log(`Status: ${status.status} | Created: ${age}`);
  console.log(`Questions: ${questions.length}`);
  console.log("");

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const selectTag = q.multiSelect ? "[multi-select]" : "[single-select]";
    const answer = answerMap.get(i);

    // Determine which options are selected
    const selectedLabels = new Set<string>();
    if (answer) {
      if (answer.selectedOption) selectedLabels.add(answer.selectedOption);
      if (answer.selectedOptions) {
        for (const opt of answer.selectedOptions) selectedLabels.add(opt);
      }
    }

    console.log(`  ${i + 1}. ${q.prompt}  ${selectTag}`);

    for (const opt of q.options) {
      const prefix = selectedLabels.has(opt.label) ? "✓" : "→";
      console.log(`     ${prefix} ${opt.label}`);
      if (opt.description) {
        console.log(`       ${opt.description}`);
      }
    }

    // Show custom text if provided
    if (answer?.customText) {
      console.log(`     ✎ Custom: ${answer.customText}`);
    }

    console.log("");
  }

  // ── Answer summary ──────────────────────────────────────────────
  if (answers && answers.length > 0) {
    const summaryParts: string[] = [];
    for (const a of answers) {
      if (a.selectedOption) {
        summaryParts.push(a.selectedOption);
      } else if (a.selectedOptions && a.selectedOptions.length > 0) {
        summaryParts.push(a.selectedOptions.join(", "));
      } else if (a.customText) {
        summaryParts.push(`"${a.customText}"`);
      }
    }
    if (summaryParts.length > 0) {
      console.log(`  (User answered: ${summaryParts.join(", ")})`);
    }
  }
}

// ── Sessions Command Dispatcher ────────────────────────────────────

export async function runSessionsCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case "list":
      return sessionsList(args.slice(1));
    case "show":
      return sessionsShow(args.slice(1));
    case "dismiss":
      return sessionsDismiss(args.slice(1));
    default:
      console.log("Usage: auq sessions <subcommand>", "\n");
      console.log("Subcommands:");
      console.log(
        "  list [--pending|--stale|--all] [--json]  List sessions",
      );
      console.log(
        "  show <sessionId> [--json]                Show session details",
      );
      console.log(
        "  dismiss <sessionId> [--force] [--json]    Dismiss/archive a session",
      );
      console.log("");
      console.log("Examples:");
      console.log("  auq sessions list");
      console.log("  auq sessions list --stale --json");
      console.log("  auq sessions show <sessionId>");
      console.log("  auq sessions show <sessionId> --json");
      console.log("  auq sessions dismiss <sessionId>");
      console.log("  auq sessions dismiss <sessionId> --force");
      if (subcommand !== undefined) {
        process.exitCode = 1;
      }
      break;
  }
}