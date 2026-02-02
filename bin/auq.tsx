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
  console.log(`
AUQ - Ask User Questions

Usage:
  auq [command] [options]

Commands:
  (default)     Start the TUI (Terminal User Interface)
  server        Start the MCP server (for use with MCP clients)
  ask <json>    Ask questions via CLI (alternative to MCP)

Options:
  --help, -h    Show this help message
  --version, -v Show version information

ASK COMMAND:
  Use 'auq ask' when you need to ask the user questions during execution.
  This allows you to:
  1. Gather user preferences or requirements
  2. Clarify ambiguous instructions
  3. Get decisions on implementation choices as you work
  4. Offer choices to the user about what direction to take

  FEATURES:
  - Ask 1-4 structured questions via an interactive terminal interface
  - Each question includes 2-4 multiple-choice options with explanatory descriptions
  - Users can always provide custom free-text input as an alternative to predefined options
  - Single-select mode (default): User picks ONE option or provides custom text
  - Multi-select mode (multiSelect: true): User can select MULTIPLE options

  USAGE NOTES:
  - Provide a descriptive 'title' field (max 12 chars) for each question
  - Use multiSelect: true when choices are not mutually exclusive
  - Option labels should be concise (1-5 words)
  - To mark a recommended option, append '(recommended)' to its label
  - Don't include an 'Other' option - it's provided automatically

  Returns a formatted summary of all questions and answers.

Examples:
  auq                    # Start TUI (wait for questions from AI)
  auq server             # Start MCP server (for Claude Desktop, etc.)
  auq ask '{"questions": [{"prompt": "Which language?", "title": "Lang", "options": [{"label": "TypeScript (recommended)"}, {"label": "Python"}], "multiSelect": false}]}'
  echo '{"questions": [...]}' | auq ask   # Pipe JSON to ask command

For more information, visit:
  https://github.com/paulp-o/ask-user-questions-mcp
`);
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

    // Log status to stderr so stdout contains only the formatted response
    console.error(`[AUQ] Session directory: ${sessionDir}`);
    console.error(
      `[AUQ] Waiting for user to answer ${questions.length} question(s)...`,
    );
    console.error(`[AUQ] User should run 'auq' in another terminal to answer.`);

    const { formattedResponse, sessionId } = await sessionManager.startSession(
      questions,
      callId,
      workingDirectory,
    );

    console.error(`[AUQ] Session ${sessionId} completed.`);
    console.log(formattedResponse);

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

// Default: Start TUI
// Important: Lazy-load Ink/React so non-interactive commands (ask/server) don't pull them in.
// Also force production mode before importing React/Ink to avoid perf_hooks measure accumulation warnings.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const { runTui } = await import("./tui-app.js");
runTui();
