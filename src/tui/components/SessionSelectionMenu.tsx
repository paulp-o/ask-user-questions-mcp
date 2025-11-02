import { Box, Text, useApp, useInput } from "ink";
import React, { useEffect, useState } from "react";

import type { SessionRequest } from "../../session/types.js";

import { createTUIWatcher } from "../session-watcher.js";

interface SessionData {
  sessionId: string;
  sessionRequest: SessionRequest;
  timestamp: Date;
}

interface SessionSelectionMenuProps {
  onSessionSelect: (sessionId: string, sessionRequest: SessionRequest) => void;
}

/**
 * SessionSelectionMenu displays a list of pending question sets and allows user to select one
 * Uses ↑↓ for navigation, Enter to select, q to quit
 */
export const SessionSelectionMenu: React.FC<SessionSelectionMenuProps> = ({
  onSessionSelect,
}) => {
  const { exit } = useApp();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  // Load pending sessions on mount and start persistent watcher
  useEffect(() => {
    let watcherInstance: null | ReturnType<typeof createTUIWatcher> = null;

    const initialize = async () => {
      try {
        setIsLoading(true);

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

        // Filter out null entries and sort by timestamp (newest first)
        const validSessions = sessionData
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setSessions(validSessions);
        setIsLoading(false);

        // Step 2: Start persistent watcher for new sessions
        watcherInstance = createTUIWatcher({ autoLoadData: true });
        watcherInstance.startEnhancedWatching((event) => {
          // Add new session to queue (FIFO - append to end)
          setSessions((prev) => {
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
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load question sets",
        );
        setIsLoading(false);
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

  // Handle keyboard input
  useInput((input, key) => {
    if (isLoading) return;

    if (key.upArrow && sessions.length > 0) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.downArrow && sessions.length > 0) {
      setSelectedIndex((prev) => Math.min(sessions.length - 1, prev + 1));
    }
    if (key.return && sessions[selectedIndex]) {
      const { sessionId, sessionRequest } = sessions[selectedIndex];
      onSessionSelect(sessionId, sessionRequest);
    }
    if (input === "q") {
      exit();
    }
  });

  // Loading state
  if (isLoading) {
    return (
      <Box padding={1}>
        <Text>Loading question sets...</Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Error: {error}</Text>
        <Text dimColor>Press q to quit</Text>
      </Box>
    );
  }

  // Zero sessions state
  if (sessions.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">No pending question sets found.</Text>
        <Text dimColor>Waiting for AI to ask questions...</Text>
        <Text dimColor>Press q to quit</Text>
      </Box>
    );
  }

  // Session selection menu
  return (
    <Box
      borderColor="cyan"
      borderStyle="round"
      flexDirection="column"
      padding={1}
    >
      <Text bold>Select a pending question set:</Text>
      <Box marginTop={1} />

      {sessions.map((session, idx) => {
        const isSelected = idx === selectedIndex;
        const indicator = isSelected ? "→" : " ";
        const questionCount = session.sessionRequest.questions.length;
        const relativeTime = formatRelativeTime(
          session.sessionRequest.timestamp,
        );

        return (
          <Text color={isSelected ? "cyan" : "white"} key={session.sessionId}>
            {indicator} Question Set {idx + 1} ({questionCount}{" "}
            {questionCount === 1 ? "question" : "questions"}) - {relativeTime}
          </Text>
        );
      })}

      <Box marginTop={1} />
      <Text dimColor>↑↓ Navigate | Enter Select | q Quit</Text>
    </Box>
  );
};

/**
 * Format timestamp as relative time (e.g., "5m ago", "2h ago")
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
