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
  https://github.com/paulp-o/ask-user-questions-mcp
`);
  process.exit(0);
}

// Read version from package.json and set as environment variable
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
process.env.AUQ_VERSION = packageJson.version;

// Display version
if (command === "--version" || command === "-v") {
  console.log(`auq-mcp-server v${process.env.AUQ_VERSION}`);
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
