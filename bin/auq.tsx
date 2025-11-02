#!/usr/bin/env node
import { exec } from "child_process";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { Box, render, Text, useApp, useInput } from "ink";
import React, { useEffect, useState } from "react";

import type { SessionRequest } from "../src/session/types.js";

import { StepperView } from "../src/tui/components/StepperView.js";
import { Toast } from "../src/tui/components/Toast.js";
import { WaitingScreen } from "../src/tui/components/WaitingScreen.js";
import { createTUIWatcher } from "../src/tui/session-watcher.js";

// Handle command-line arguments
const args = process.argv.slice(2);
const command = args[0];

// Display help
if (command === "--help" || command === "-h") {
  console.log(`
AUQ MCP Server - Ask User Questions

Usage:
  auq [command] [options]

Commands:
  (default)     Start the TUI (Terminal User Interface)
  server        Start the MCP server (for use with MCP clients)

Options:
  --help, -h    Show this help message
  --version, -v Show version information

Examples:
  auq                    # Start TUI (wait for questions from AI)
  auq server             # Start MCP server (for Claude Desktop, etc.)
  auq --help             # Show this help message

For more information, visit:
  https://github.com/paulp-o/ask-user-question-mcp
`);
  process.exit(0);
}

// Display version
if (command === "--version" || command === "-v") {
  // Read version from package.json
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJsonPath = join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  console.log(`auq-mcp-server v${packageJson.version}`);
  process.exit(0);
}

// Handle 'server' command
if (command === "server") {
  console.log("Starting MCP server...");
  const serverProcess = exec("node dist/src/server.js", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting server: ${error.message}`);
      process.exit(1);
    }
    if (stderr) {
      console.error(stderr);
    }
    console.log(stdout);
  });

  // Forward signals
  process.on("SIGINT", () => {
    serverProcess.kill("SIGINT");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    serverProcess.kill("SIGTERM");
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
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
}

const App: React.FC = () => {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>({ mode: "WAITING" });
  const [sessionQueue, setSessionQueue] = useState<SessionData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Initialize: Load existing sessions + start persistent watcher
  useEffect(() => {
    let watcherInstance: null | ReturnType<typeof createTUIWatcher> = null;

    const initialize = async () => {
      try {
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

  // Global 'q' to quit anytime
  useInput((input) => {
    if (input === "q") {
      exit();
    }
  });

  // Show toast notification
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  // Handle session completion
  const handleSessionComplete = () => {
    // Show success toast
    showToast("✓ Answers submitted successfully!", "success");

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
        onComplete={handleSessionComplete}
        sessionId={session.sessionId}
        sessionRequest={session.sessionRequest}
      />
    );
  }

  // Render with toast overlay if present
  return (
    <Box flexDirection="column">
      {toast && (
        <Box marginBottom={1}>
          <Toast
            message={toast.message}
            onDismiss={() => setToast(null)}
            type={toast.type}
          />
        </Box>
      )}
      {mainContent}
    </Box>
  );
};

render(<App />);
