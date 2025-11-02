#!/usr/bin/env node
import { render, Text, useApp, useInput } from "ink";
import React, { useEffect, useState } from "react";

import type { SessionRequest } from "../src/session/types.js";

import { StepperView } from "../src/tui/components/StepperView.js";
import { WaitingScreen } from "../src/tui/components/WaitingScreen.js";
import { createTUIWatcher } from "../src/tui/session-watcher.js";

type AppState =
  | { mode: "PROCESSING"; session: SessionData }
  | { mode: "WAITING" };

interface SessionData {
  sessionId: string;
  sessionRequest: SessionRequest;
  timestamp: Date;
}

const App: React.FC = () => {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>({ mode: "WAITING" });
  const [sessionQueue, setSessionQueue] = useState<SessionData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

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

  // Handle session completion
  const handleSessionComplete = () => {
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

  if (state.mode === "WAITING") {
    return <WaitingScreen queueCount={sessionQueue.length} />;
  }

  // PROCESSING mode
  const { session } = state;
  return (
    <StepperView
      onComplete={handleSessionComplete}
      sessionId={session.sessionId}
      sessionRequest={session.sessionRequest}
    />
  );
};

render(<App />);
