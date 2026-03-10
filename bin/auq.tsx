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
  console.log(`auq - Ask User Questions (MCP server + TUI)

Usage: auq [command] [options]

Commands:
  (default)              Start interactive TUI
  server                 Start MCP server (stdio)
  ask <json>             Ask questions via CLI
  answer <id> [flags]    Answer or reject a session
  sessions <sub> [flags] List/dismiss sessions
  config <sub> [flags]   Get/set configuration
  update                 Check for and install updates

Answer:
  auq answer <id> --answers '<json>'    Submit answers
  auq answer <id> --reject [--reason]   Reject session
  Flags: --force  --json

Sessions:
  auq sessions list [--pending|--stale|--all] [--json]
  auq sessions show <id> [--json]
  auq sessions dismiss <id> [--force] [--json]

Config:
  auq config get [key] [--json]
  auq config set <key> <value> [--global] [--json]

Options:
  -h, --help      Show this help
  -v, --version   Show version

Keys (TUI):
  ↑↓ navigate  ←→/Tab questions  Space toggle  Enter select
  R recommend  Ctrl+R quick-submit  Esc reject
  [/] sessions  1-9 jump  Ctrl+S picker  Ctrl+T theme

Config: ./.auqrc.json (local) > ~/.config/auq/.auqrc.json (global)
Env:    AUQ_SESSION_DIR  XDG_CONFIG_HOME`);
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
