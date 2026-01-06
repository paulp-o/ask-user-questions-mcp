#!/usr/bin/env node
// import { exec } from "child_process";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { Box, render, Text } from "ink";
import React, { useEffect, useState } from "react";

import type { SessionRequest } from "../src/session/types.js";

import {
  ensureDirectoryExists,
  getSessionDirectory,
} from "../src/session/utils.js";
import { Header } from "../src/tui/components/Header.js";
import { StepperView } from "../src/tui/components/StepperView.js";
import { Toast } from "../src/tui/components/Toast.js";
import { WaitingScreen } from "../src/tui/components/WaitingScreen.js";
import { createTUIWatcher } from "../src/tui/session-watcher.js";
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
  - Always provide a descriptive 'title' field (max 12 chars) for each question
  - Use multiSelect: true when choices are not mutually exclusive
  - Option labels should be concise (1-5 words)
  - Questions should end with a question mark
  - Don't include an 'Other' option - it's provided automatically
  - Mark one option as recommended.

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
type AppState =
  | { mode: "PROCESSING"; session: SessionData }
  | { mode: "WAITING" };

interface SessionData {
  sessionId: string;
  sessionRequest: SessionRequest;
  timestamp: Date;
}

interface ToastData {
  message: string;
  type: "success" | "error" | "info";
  title?: string;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({ mode: "WAITING" });
  const [sessionQueue, setSessionQueue] = useState<SessionData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showSessionLog, setShowSessionLog] = useState(true);

  // Get session directory for logging
  const sessionDir = getSessionDirectory();

  // Auto-hide session log after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSessionLog(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize: Load existing sessions + start persistent watcher
  useEffect(() => {
    let watcherInstance: null | ReturnType<typeof createTUIWatcher> = null;

    const initialize = async () => {
      try {
        // Step 0: Ensure session directory exists
        await ensureDirectoryExists(sessionDir);

        // Step 1: Load existing pending sessions
        const watcher = createTUIWatcher();
        const sessionIds = await watcher.getPendingSessions();

        const sessionData = await Promise.all(
          sessionIds.map(async (sessionId) => {
            const sessionRequest = await watcher.getSessionRequest(sessionId);
            if (!sessionRequest) return null;

            return {
              sessionId,
              sessionRequest,
              timestamp: new Date(sessionRequest.timestamp),
            };
          }),
        );

        // Filter out null entries and sort by timestamp (FIFO - oldest first)
        const validSessions = sessionData
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        setSessionQueue(validSessions);
        setIsInitialized(true);

        // Step 2: Start persistent watcher for new sessions
        watcherInstance = createTUIWatcher({ autoLoadData: true });
        watcherInstance.startEnhancedWatching((event) => {
          // Add new session to queue (FIFO - append to end)
          setSessionQueue((prev) => {
            // Check for duplicates
            if (prev.some((s) => s.sessionId === event.sessionId)) {
              return prev;
            }

            // Add to end of queue
            return [
              ...prev,
              {
                sessionId: event.sessionId,
                sessionRequest: event.sessionRequest!,
                timestamp: new Date(event.timestamp),
              },
            ];
          });
        });
      } catch (error) {
        console.error("Failed to initialize:", error);
        setIsInitialized(true); // Continue even if initialization fails
      }
    };

    initialize();

    // Cleanup: stop watcher on unmount
    return () => {
      if (watcherInstance) {
        watcherInstance.stop();
      }
    };
  }, []);

  // Auto-transition: WAITING → PROCESSING when queue has items
  useEffect(() => {
    if (!isInitialized) return;

    if (state.mode === "WAITING" && sessionQueue.length > 0) {
      const [nextSession, ...rest] = sessionQueue;
      setSessionQueue(rest);
      setState({ mode: "PROCESSING", session: nextSession });
    }
  }, [state, sessionQueue, isInitialized]);

  // Show toast notification
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
    title?: string,
  ) => {
    setToast({ message, type, title });
  };

  // Handle session completion
  const handleSessionComplete = (
    wasRejected = false,
    rejectionReason?: string | null,
  ) => {
    // Show appropriate toast
    if (wasRejected) {
      if (rejectionReason) {
        showToast(
          `Rejection reason: ${rejectionReason}`,
          "info",
          "Question set rejected",
        );
      } else {
        showToast("", "info", "Question set rejected");
      }
    } else {
      showToast("✓ Answers submitted successfully!", "success");
    }

    if (sessionQueue.length > 0) {
      // Auto-load next session
      const [nextSession, ...rest] = sessionQueue;
      setSessionQueue(rest);
      setState({ mode: "PROCESSING", session: nextSession });
    } else {
      // Return to WAITING
      setState({ mode: "WAITING" });
    }
  };

  // Render based on state
  if (!isInitialized) {
    return <Text>Loading...</Text>;
  }

  let mainContent;
  if (state.mode === "WAITING") {
    mainContent = <WaitingScreen queueCount={sessionQueue.length} />;
  } else {
    // PROCESSING mode
    const { session } = state;
    mainContent = (
      <StepperView
        key={session.sessionId}
        onComplete={handleSessionComplete}
        sessionId={session.sessionId}
        sessionRequest={session.sessionRequest}
      />
    );
  }

  // Render with header, toast overlay, and main content
  return (
    <Box flexDirection="column" paddingX={1}>
      <Header pendingCount={sessionQueue.length} />
      {toast && (
        <Box marginBottom={1} marginTop={1}>
          <Toast
            message={toast.message}
            onDismiss={() => setToast(null)}
            type={toast.type}
            title={toast.title}
          />
        </Box>
      )}
      {mainContent}
      {showSessionLog && (
        <Box marginTop={1}>
          <Text dimColor>[AUQ] Session directory: {sessionDir}</Text>
        </Box>
      )}
    </Box>
  );
};

// Clear terminal before showing app
console.clear();

const { waitUntilExit } = render(<App />);

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  process.exit(0);
});

// Show goodbye after Ink unmounts
waitUntilExit().then(() => {
  process.stdout.write("\n");
  console.log("👋 Goodbye! See you next time.");
});
