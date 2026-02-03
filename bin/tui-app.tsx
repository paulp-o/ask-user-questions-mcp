import { Box, render, Text } from "ink";
import React, { useEffect, useMemo, useRef, useState } from "react";

import type { AUQConfig } from "../src/config/types.js";
import type { SessionRequest } from "../src/session/types.js";

import {
  ensureDirectoryExists,
  getSessionDirectory,
} from "../src/session/utils.js";
import { Header } from "../src/tui/components/Header.js";
import { StepperView } from "../src/tui/components/StepperView.js";
import { ThemeIndicator } from "../src/tui/components/ThemeIndicator.js";
import { Toast } from "../src/tui/components/Toast.js";
import { WaitingScreen } from "../src/tui/components/WaitingScreen.js";
import {
  createNotificationBatcher,
  showProgress,
  clearProgress,
  calculateProgress,
  checkLinuxDependencies,
  type NotificationBatcher,
} from "../src/tui/notifications/index.js";
import { createTUIWatcher } from "../src/tui/session-watcher.js";
import { ThemeProvider } from "../src/tui/ThemeProvider.js";

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

interface AppProps {
  config?: AUQConfig;
}

const App: React.FC<AppProps> = ({ config }) => {
  const [state, setState] = useState<AppState>({ mode: "WAITING" });
  const [sessionQueue, setSessionQueue] = useState<SessionData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showSessionLog, setShowSessionLog] = useState(true);

  // Get session directory for logging
  const sessionDir = getSessionDirectory();

  // Notification configuration from config
  const notificationConfig = useMemo(
    () => config?.notifications ?? { enabled: true, sound: true },
    [config?.notifications],
  );

  // Create notification batcher (memoized to persist across renders)
  const notificationBatcherRef = useRef<NotificationBatcher | null>(null);
  if (!notificationBatcherRef.current) {
    notificationBatcherRef.current =
      createNotificationBatcher(notificationConfig);
  }

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

        // Step 0.5: Check Linux dependencies for native notifications
        await checkLinuxDependencies();

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

            // Queue notification for new session (batched)
            if (notificationBatcherRef.current) {
              notificationBatcherRef.current.queue(event.sessionId);
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

    // Cleanup: stop watcher and cancel notifications on unmount
    return () => {
      if (watcherInstance) {
        watcherInstance.stop();
      }
      if (notificationBatcherRef.current) {
        notificationBatcherRef.current.cancel();
      }
      // Clear progress bar on unmount
      clearProgress(notificationConfig);
    };
  }, [notificationConfig]);

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

  // Handle progress updates from StepperView
  const handleProgressUpdate = (answered: number, total: number) => {
    const percent = calculateProgress(answered, total);
    showProgress(percent, notificationConfig);
  };

  // Handle session completion
  const handleSessionComplete = (
    wasRejected = false,
    rejectionReason?: string | null,
  ) => {
    // Clear progress bar on session completion
    clearProgress(notificationConfig);

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
        onProgress={handleProgressUpdate}
        sessionId={session.sessionId}
        sessionRequest={session.sessionRequest}
      />
    );
  }

  // Render with header, toast overlay, and main content
  // Use theme from config, falling back to "system" if not specified
  const initialTheme = config?.theme || "system";

  return (
    <ThemeProvider initialTheme={initialTheme}>
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
        <ThemeIndicator />
      </Box>
    </ThemeProvider>
  );
};

export const runTui = (config?: AUQConfig) => {
  // Clear terminal before showing app
  console.clear();

  const { waitUntilExit } = render(<App config={config} />);

  // Handle Ctrl+C gracefully
  process.on("SIGINT", () => {
    process.exit(0);
  });

  // Show goodbye after Ink unmounts
  waitUntilExit().then(() => {
    process.stdout.write("\n");
    console.log("👋 Goodbye! See you next time.");
  });
};
