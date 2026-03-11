/**
 * CLI History Command — `auq history` and `auq history show <id>`
 * List and browse historical sessions with filtering and search.
 */

import chalk from "chalk";

import { SessionManager } from "../../session/SessionManager.js";
import { getSessionDirectory } from "../../session/utils.js";
import { formatAge, parseFlags } from "../utils.js";
import type {
  SessionAnswer,
  SessionRequest,
  SessionStatus,
} from "../../session/types.js";

// ── Helper Functions ────────────────────────────────────────────────

function getStatusIndicator(status: string): string {
  switch (status) {
    case "completed":
      return chalk.green("✓ completed");
    case "rejected":
      return chalk.red("✗ rejected");
    case "pending":
      return chalk.yellow("⏳ pending");
    case "in-progress":
      return chalk.yellow("⏳ in-progress");
    case "timed_out":
      return chalk.yellow("⏱ timed_out");
    case "abandoned":
      return chalk.dim("… abandoned");
    default:
      return status;
  }
}

function getReadIndicator(lastReadAt?: string): string {
  return lastReadAt ? "✓" : "─";
}

function truncatePreview(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

function padColumn(text: string, width: number): string {
  // Strip ANSI escape codes for length calculation
  const plainText = text.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, width - plainText.length);
  return text + " ".repeat(padding);
}

async function resolveSessionId(
  sessionManager: SessionManager,
  idArg: string,
): Promise<string | null> {
  // Try exact full UUID match first
  const exists = await sessionManager.sessionExists(idArg);
  if (exists) return idArg;

  // Try short ID prefix match
  const allIds = await sessionManager.getAllSessionIds();
  const shortMatches = allIds.filter((id) => id.startsWith(idArg));
  if (shortMatches.length === 1) return shortMatches[0];

  return null;
}

// ── History Entry Interface ─────────────────────────────────────────

interface HistoryEntry {
  sessionId: string;
  shortId: string;
  status: string;
  createdAt: string;
  lastReadAt: string | undefined;
  questionCount: number;
  answeredCount: number;
  preview: string;
  searchText: string;
  isAbandoned: boolean;
}

// ── List History ────────────────────────────────────────────────────

async function listHistory(
  _positionals: string[],
  flags: Record<string, string | true>,
): Promise<void> {
  const jsonMode = flags.json === true;
  const showAll = flags.all === true;
  const filterUnread = flags.unread === true;
  const sessionFilter =
    typeof flags.session === "string" ? flags.session : undefined;
  const searchFilter =
    typeof flags.search === "string" ? flags.search.toLowerCase() : undefined;
  const limitRaw =
    typeof flags.limit === "string" ? parseInt(flags.limit, 10) : 20;
  const limit = isNaN(limitRaw) ? 20 : Math.max(1, limitRaw);

  // Initialize SessionManager
  const sessionManager = new SessionManager({
    baseDir: getSessionDirectory(),
  });
  await sessionManager.initialize();

  // Get all session IDs
  const sessionIds = await sessionManager.getAllSessionIds();

  // Build entries
  const entries: HistoryEntry[] = [];
  let abandonedCount = 0;

  for (const sessionId of sessionIds) {
    let status: SessionStatus | null = null;
    let request: SessionRequest | null = null;
    let answersData: SessionAnswer | null = null;

    try {
      status = await sessionManager.getSessionStatus(sessionId);
      if (!status) continue;

      request = await sessionManager.getSessionRequest(sessionId);

      try {
        answersData = await sessionManager.getSessionAnswers(sessionId);
      } catch {
        // answers.json may not exist — that's ok
      }
    } catch {
      continue; // Skip broken sessions
    }

    if (!status) continue;

    const isAbandoned = status.status === "abandoned";
    if (isAbandoned) abandonedCount++;

    const questionCount =
      request?.questions?.length ?? status.totalQuestions ?? 0;
    const answeredCount = answersData?.answers?.length ?? 0;
    const lastReadAt = answersData?.lastReadAt;

    // Build preview from first question prompt
    const firstQuestion = request?.questions?.[0];
    const preview = firstQuestion
      ? truncatePreview(firstQuestion.prompt, 40)
      : "";

    // Build search text from all question prompts and answer data
    const searchTextParts: string[] = [];
    if (request?.questions) {
      for (const q of request.questions) {
        searchTextParts.push(q.prompt.toLowerCase());
        if (q.title) searchTextParts.push(q.title.toLowerCase());
      }
    }
    if (answersData?.answers) {
      for (const a of answersData.answers) {
        if (a.selectedOption)
          searchTextParts.push(a.selectedOption.toLowerCase());
        if (a.selectedOptions) {
          for (const opt of a.selectedOptions)
            searchTextParts.push(String(opt).toLowerCase());
        }
        if (a.customText) searchTextParts.push(a.customText.toLowerCase());
      }
    }
    const searchText = searchTextParts.join(" ");

    entries.push({
      sessionId,
      shortId: sessionId.slice(0, 8),
      status: status.status,
      createdAt: status.createdAt,
      lastReadAt,
      questionCount,
      answeredCount,
      preview,
      searchText,
      isAbandoned,
    });
  }

  // Sort by createdAt descending (newest first)
  entries.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Apply filters
  let filtered = [...entries];

  // Base filter: exclude abandoned unless --all
  if (!showAll) {
    filtered = filtered.filter((e) => !e.isAbandoned);
  }

  // --session filter
  if (sessionFilter !== undefined) {
    filtered = filtered.filter(
      (e) =>
        e.sessionId === sessionFilter ||
        e.sessionId.startsWith(sessionFilter),
    );
    if (filtered.length === 0) {
      if (jsonMode) {
        console.log(JSON.stringify([], null, 2));
      } else {
        console.error(`Session not found: ${sessionFilter}`);
      }
      process.exitCode = 1;
      return;
    }
  }

  // --unread filter
  if (filterUnread) {
    filtered = filtered.filter(
      (e) => e.status === "completed" && !e.lastReadAt,
    );
  }

  // --search filter
  if (searchFilter !== undefined) {
    filtered = filtered.filter((e) => e.searchText.includes(searchFilter));
  }

  // Apply limit
  const displayed = filtered.slice(0, limit);

  // JSON output
  if (jsonMode) {
    const result = displayed.map((e) => ({
      sessionId: e.sessionId,
      status: e.status,
      createdAt: e.createdAt,
      lastReadAt: e.lastReadAt ?? null,
      questionCount: e.questionCount,
      answeredCount: e.answeredCount,
      preview: e.preview,
    }));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Empty state
  if (displayed.length === 0) {
    console.log("No sessions found.");
    return;
  }

  // Table output
  const headerLine =
    padColumn("ID", 10) +
    padColumn("Status", 16) +
    padColumn("Time", 10) +
    padColumn("Read", 7) +
    padColumn("Q", 6) +
    "Preview";
  console.log(chalk.dim(headerLine));

  for (const entry of displayed) {
    const statusStr = getStatusIndicator(entry.status);
    const age = formatAge(entry.createdAt);
    const readStr = getReadIndicator(entry.lastReadAt);
    const questionsStr = `${entry.answeredCount}/${entry.questionCount}`;

    const line =
      padColumn(entry.shortId, 10) +
      padColumn(statusStr, 16) +
      padColumn(age, 10) +
      padColumn(readStr, 7) +
      padColumn(questionsStr, 6) +
      entry.preview;

    console.log(line);
  }

  // Hint line when abandoned sessions are hidden
  if (!showAll && abandonedCount > 0) {
    console.log(
      chalk.dim(
        `\n${displayed.length} sessions shown (${abandonedCount} abandoned hidden, use --all)`,
      ),
    );
  }
}

// ── Show History ────────────────────────────────────────────────────

async function showHistory(
  positionals: string[],
  flags: Record<string, string | true>,
): Promise<void> {
  const jsonMode = flags.json === true;
  const idArg = positionals[0];

  if (!idArg) {
    console.error(
      "Missing session ID. Usage: auq history show <sessionId> [--json]",
    );
    process.exitCode = 1;
    return;
  }

  // Initialize SessionManager
  const sessionManager = new SessionManager({
    baseDir: getSessionDirectory(),
  });
  await sessionManager.initialize();

  // Resolve session ID (full UUID or short prefix)
  const sessionId = await resolveSessionId(sessionManager, idArg);
  if (!sessionId) {
    console.error(`Session not found: ${idArg}`);
    process.exitCode = 1;
    return;
  }

  // Load session data
  const status = await sessionManager.getSessionStatus(sessionId);
  const request = await sessionManager.getSessionRequest(sessionId);
  let answersData: SessionAnswer | null = null;
  try {
    answersData = await sessionManager.getSessionAnswers(sessionId);
  } catch {
    // answers.json may not exist for pending/abandoned sessions
  }

  if (!status || !request) {
    console.error(`Could not read session data for: ${idArg}`);
    process.exitCode = 1;
    return;
  }

  const questions = request.questions;
  const answers = answersData?.answers ?? null;
  const lastReadAt = answersData?.lastReadAt;
  const answeredCount = answers?.length ?? 0;

  // Build answer lookup (questionIndex → answer)
  const answerMap = new Map<
    number,
    {
      selectedOption?: string;
      selectedOptions?: string[];
      customText?: string;
    }
  >();
  if (answers) {
    for (const a of answers) {
      answerMap.set(a.questionIndex, {
        selectedOption: a.selectedOption,
        selectedOptions: a.selectedOptions,
        customText: a.customText,
      });
    }
  }

  // JSON output
  if (jsonMode) {
    const result = {
      sessionId,
      status: status.status,
      createdAt: status.createdAt,
      lastReadAt: lastReadAt ?? null,
      questionCount: questions.length,
      answeredCount,
      questions: questions.map((q, i) => {
        const answer = answerMap.get(i);
        const selectedLabels = new Set<string>();
        if (answer?.selectedOption) selectedLabels.add(answer.selectedOption);
        if (answer?.selectedOptions) {
          for (const opt of answer.selectedOptions) selectedLabels.add(String(opt));
        }
        return {
          index: i,
          title: q.title,
          prompt: q.prompt,
          multiSelect: q.multiSelect ?? false,
          options: q.options.map((o) => ({
            label: o.label,
            description: o.description ?? null,
            selected: selectedLabels.has(o.label),
          })),
          customText: answer?.customText ?? null,
        };
      }),
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Human-readable output
  const age = formatAge(status.createdAt);
  const createdAbsolute = new Date(status.createdAt)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "Z");

  console.log(`Session: ${sessionId}`);
  console.log(`Status: ${getStatusIndicator(status.status)}`);
  console.log(`Created: ${createdAbsolute} (${age})`);

  if (lastReadAt) {
    const readAbsolute = new Date(lastReadAt)
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d+Z$/, "Z");
    console.log(`Read: ✓ ${readAbsolute}`);
  } else {
    console.log("Read: unread");
  }

  console.log(`Questions: ${answeredCount}/${questions.length} answered`);
  console.log("");

  // Display questions with options
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const answer = answerMap.get(i);

    // Determine which option labels are selected
    const selectedLabels = new Set<string>();
    if (answer?.selectedOption) selectedLabels.add(answer.selectedOption);
    if (answer?.selectedOptions) {
      for (const opt of answer.selectedOptions) selectedLabels.add(String(opt));
    }

    console.log(`${i + 1}. ${q.title}`);
    console.log(`   ${q.prompt}`);

    let otherOptionHandled = false;

    for (const opt of q.options) {
      const isSelected = selectedLabels.has(opt.label);
      const descPart = opt.description ? ` — ${opt.description}` : "";

      // If this is the "Other" option and there's custom text, show custom text inline
      if (isSelected && answer?.customText && opt.label === "Other") {
        console.log(`   (selected) Other: '${answer.customText}'`);
        otherOptionHandled = true;
      } else if (isSelected) {
        console.log(`   (selected) ${opt.label}${descPart}`);
      } else {
        console.log(`   ${opt.label}${descPart}`);
      }
    }

    // If customText exists but "Other" is not a listed option, show it as additional entry
    if (answer?.customText && !otherOptionHandled) {
      const hasOtherOption = q.options.some((o) => o.label === "Other");
      if (!hasOtherOption) {
        console.log(`   (selected) Other: '${answer.customText}'`);
      }
    }

    console.log("");
  }
}

// ── History Command Dispatcher ──────────────────────────────────────

export async function runHistoryCommand(args: string[]): Promise<void> {
  const { flags, positionals } = parseFlags(args);
  const subcommand = positionals[0];

  if (subcommand === "show") {
    await showHistory(positionals.slice(1), flags);
  } else {
    await listHistory(positionals, flags);
  }
}