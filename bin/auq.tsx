#!/usr/bin/env node
// import { exec } from "child_process";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import type { SessionRequest } from "../src/session/types.js";

import { getSessionDirectory } from "../src/session/utils.js";
// import { goodbyeText } from "../src/tui/utils/gradientText.js";

// Handle command-line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === "--help" || command === "-h") {
  // Read version dynamically (same as --version block)
  const __filenameH = fileURLToPath(import.meta.url);
  const __dirnameH = dirname(__filenameH);
  let _helpVersion = "unknown";
  for (const _p of [join(__dirnameH, "..", "package.json"), join(__dirnameH, "..", "..", "package.json")]) {
    try { _helpVersion = JSON.parse(readFileSync(_p, "utf-8")).version; break; } catch { /* try next */ }
  }
  console.log(`auq - Ask User Questions (MCP Server + Interactive TUI)
Version: ${_helpVersion}

USAGE
  auq                          Start interactive TUI (default)
  auq <command> [options]      Run a specific command

COMMANDS
  server                       Start MCP server over stdio
  ask <json|->                 Create a question session (json arg or stdin)
  answer <sessionId> [flags]   Submit answers or reject a session
  sessions <subcommand>        Manage sessions (list/show/dismiss)
  fetch-answers [sessionId]    Fetch answered sessions or poll for answers
  history [subcommand]         Browse past session history
  config <subcommand>          Get or set configuration values
  update                       Check for and install updates

SUBCOMMANDS

  sessions list [flags]        List sessions
    --pending                  Show only pending sessions (default)
    --stale                    Show only stale sessions
    --all                      Show all sessions regardless of status
    --limit <N>                Max items per page (default: 20)
    --page <N>                 Page number (default: 1)
    --json                     Output as JSON

  sessions show <sessionId>    Show session details
    --json                     Output as JSON

  sessions dismiss <sessionId> Dismiss a stale session
    --force                    Force dismiss even if not stale
    --json                     Output as JSON

  history [flags]              List session history
    --all                      Include abandoned sessions
    --unread                   Show only unread sessions
    --search <text>            Search in prompts and answers
    --session <id>             Filter to specific session
    --limit <N>                Max items per page (default: 20)
    --page <N>                 Page number (default: 1)
    --json                     Output as JSON

  history show <sessionId>     Show full session Q&A detail
    --json                     Output as JSON

  config get [key]             Get config value(s)
    --json                     Output as JSON

  config set <key> <value>     Set a config value
    --global                   Write to global config (~/.config/auq/.auqrc.json)
    --json                     Output as JSON

COMMAND FLAGS

  ask <json|->
    Accepts JSON string as argument or "-" to read from stdin.
    JSON format: {\"questions\":[{\"prompt\":\"...\",\"title\":\"...\",\"options\":[{\"label\":\"...\",\"description\":\"...\"}]}]}

  answer <sessionId>
    --answers '<json>'         Submit answers as JSON
    --reject                   Reject the session instead of answering
    --reason \"<text>\"          Reason for rejection (used with --reject)
    --force                    Force answer even if session is abandoned
    --json                     Output as JSON
    Answer JSON format: {\"0\":{\"selectedOption\":\"Label\"}}
    Keys = question indices (0,1,2...); values can include:
      selectedOption: \"Label\"         single-select answer
      selectedOptions: [\"A\",\"B\"]      multi-select answer
      customText: \"free text\"          custom/other input

  fetch-answers [sessionId]
    --blocking                 Wait until session is answered (requires sessionId)
    --unread                   List unread answered sessions
    --limit <N>                Max items per page (default: 20)
    --page <N>                 Page number (default: 1)
    --json                     Output as JSON

  update
    -y, --yes                  Skip confirmation prompt
    --json                     Output as JSON

GLOBAL FLAGS
  -h, --help                   Show this help
  -v, --version                Show version number
  --json                       Output as machine-readable JSON (supported by most commands)

CONFIG KEYS (for 'config get/set')
  maxOptions      number (2-10)              Max options per question
  maxQuestions    number (1-10)              Max questions per session
  sessionTimeout  number (ms)                Session timeout in milliseconds
  theme           string                     UI theme name
  language        string                     UI language
  renderer        \"ink\" | \"opentui\"          TUI renderer engine
  staleAction     \"warn\"|\"remove\"|\"archive\"  Action for stale sessions
  updateCheck     boolean                    Enable/disable auto-update checks

ENVIRONMENT VARIABLES
  AUQ_RENDERER         Override renderer (\"ink\" or \"opentui\")
  AUQ_SESSION_DIR      Custom session storage directory
  XDG_CONFIG_HOME      Custom config directory (default: ~/.config)
  NO_UPDATE_NOTIFIER   Set to \"1\" to disable update checks

CONFIG FILES
  ./.auqrc.json                Local config (highest priority)
  ~/.config/auq/.auqrc.json    Global config (fallback)

EXAMPLES
  auq                                            Launch TUI
  auq ask '{\"questions\":[{\"prompt\":\"Continue?\",\"options\":[{\"label\":\"Yes\"},{\"label\":\"No\"}]}]}'
  auq answer abc123 --answers '{\"0\":{\"selectedOption\":\"Yes\"}}'
  auq sessions list --all --json
  auq history --search \"deploy\" --limit 10
  auq config set renderer opentui
  auq fetch-answers abc123 --blocking
  auq update -y`);
  process.exit(0);
}

// Display version
if (command === "--version" || command === "-v") {
  // Read version from package.json (handle both local dev and global install)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // Try different possible paths for package.json
  const possiblePaths = [
    join(__dirname, "..", "package.json"), // dist/../package.json (local dev)
    join(__dirname, "..", "..", "package.json"), // dist/bin/../../package.json (global install)
  ];

  let packageJson = null;
  for (const path of possiblePaths) {
    try {
      packageJson = JSON.parse(readFileSync(path, "utf-8"));
      break;
    } catch {
      // Try next path
    }
  }

  if (packageJson) {
    console.log(`auq-mcp-server v${packageJson.version}`);
  } else {
    console.log("auq-mcp-server v0.1.17"); // Fallback version
  }
  process.exit(0);
}

// Handle 'server' command
if (command === "server") {
  // Import and start the MCP server directly
  // This avoids spawning a subprocess and outputting non-JSON to stdout
  await import("../src/server.js");
  // The server will start and handle stdio communication
  // Keep process alive
  await new Promise(() => {});
}

// Handle 'update' command
if (command === "update") {
  const { runUpdateCommand } = await import("../src/cli/commands/update.js");
  await runUpdateCommand(args.slice(1));
  process.exit(0);
}

// ── Fire-and-forget update notification ────────────────────────────
// Start a non-blocking update check for non-TUI CLI commands.
// The result is awaited briefly after the main command finishes.
let updateNotification: Promise<void> | null = null;
if (
  command &&
  !["server", "--help", "-h", "--version", "-v", "update"].includes(command)
) {
  updateNotification = (async () => {
    try {
      if (
        process.env.NO_UPDATE_NOTIFIER === "1" ||
        process.env.CI === "true" ||
        process.env.CI === "1" ||
        process.env.NODE_ENV === "test"
      )
        return;
      const { UpdateChecker } = await import("../src/update/index.js");
      const checker = new UpdateChecker();
      const result = await Promise.race([
        checker.check(),
        new Promise<null>((r) => setTimeout(() => r(null), 5000)),
      ]);
      if (result) {
        process.stderr.write(
          `Update available: ${result.currentVersion} \u2192 ${result.latestVersion}. Run \`auq update\` to upgrade.\n`,
        );
      }
    } catch {
      // Silently ignore — update checks must never break the main command
    }
  })();
}

// Handle 'ask' command
if (command === "ask") {
  const { SessionManager } = await import("../src/session/index.js");
  const { randomUUID } = await import("crypto");

  const sessionDir = getSessionDirectory();
  const sessionManager = new SessionManager({ baseDir: sessionDir });
  await sessionManager.initialize();

  let questionsJson = args[1];

  if (!questionsJson) {
    const chunks: Buffer[] = [];
    const stdin = process.stdin;
    stdin.setEncoding("utf8");

    // Only read from stdin if it's piped (not interactive TTY)
    if (!stdin.isTTY) {
      for await (const chunk of stdin) {
        chunks.push(Buffer.from(chunk));
      }
      questionsJson = Buffer.concat(chunks).toString("utf8").trim();
    }
  }

  if (!questionsJson) {
    console.error(
      "Error: Questions JSON required. Provide as argument or pipe to stdin.",
    );
    console.error("");
    console.error("Usage:");
    console.error(
      '  auq ask \'{"questions": [{"prompt": "...", "title": "...", "options": [...], "multiSelect": false}]}\'',
    );
    console.error("");
    console.error("Or pipe JSON:");
    console.error("  echo '{...}' | auq ask");
    process.exit(1);
  }

  try {
    const input = JSON.parse(questionsJson);
    const questions = input.questions;
    const workingDirectory: string | undefined = input.workingDirectory;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      console.error(
        "Error: 'questions' array is required and must not be empty.",
      );
      process.exit(1);
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt || typeof q.prompt !== "string") {
        console.error(`Error: Question ${i + 1} missing 'prompt' field.`);
        process.exit(1);
      }
      if (!q.title || typeof q.title !== "string") {
        console.error(`Error: Question ${i + 1} missing 'title' field.`);
        process.exit(1);
      }
      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        console.error(
          `Error: Question ${i + 1} requires 'options' array with at least 2 options.`,
        );
        process.exit(1);
      }
      if (q.multiSelect === undefined) {
        q.multiSelect = false;
      }
    }

    const callId = randomUUID();

    const { formattedResponse, sessionId } = await sessionManager.startSession(
      questions,
      callId,
      workingDirectory,
    );

    console.log(formattedResponse);

    await updateNotification;
    process.exit(0);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("Error: Invalid JSON input.");
      console.error(error.message);
    } else {
      console.error(
        "Error:",
        error instanceof Error ? error.message : String(error),
      );
    }
    process.exit(1);
  }
}

// Handle 'answer' command
if (command === "answer") {
  const { runAnswerCommand } = await import("../src/cli/commands/answer.js");
  await runAnswerCommand(args.slice(1));
  await updateNotification;
  process.exit(0);
}

// Handle 'sessions' command
if (command === "sessions") {
  const { runSessionsCommand } = await import("../src/cli/commands/sessions.js");
  await runSessionsCommand(args.slice(1));
  await updateNotification;
  process.exit(0);
}

// Handle 'config' command
if (command === "config") {
  const { runConfigCommand } = await import("../src/cli/commands/config.js");
  await runConfigCommand(args.slice(1));
  await updateNotification;
  process.exit(0);
}

// Handle 'fetch-answers' command
if (command === "fetch-answers") {
  const { runFetchAnswersCommand } = await import("../src/cli/commands/fetch-answers.js");
  await runFetchAnswersCommand(args.slice(1));
  await updateNotification;
  process.exit(0);
}

// Handle 'history' command
if (command === "history") {
  const { runHistoryCommand } = await import("../src/cli/commands/history.js");
  await runHistoryCommand(args.slice(1));
  await updateNotification;
  process.exit(0);
}

// Default: Start TUI
// Important: Lazy-load Ink/React so non-interactive commands (ask/server) don't pull them in.
// Also force production mode before importing React/Ink to avoid perf_hooks measure accumulation warnings.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

// Load configuration before starting TUI
const { getConfig } = await import("../src/config/index.js");
const { initI18n } = await import("../src/i18n/index.js");

// Initialize config and i18n
const config = getConfig();
initI18n(config.language);

const { runTui } = await import("./tui-app.js");
runTui(config);
