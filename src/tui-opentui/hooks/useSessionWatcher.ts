import { useState, useCallback, useRef } from "react";
import type { SessionRequest } from "../../session/types.js";
import type { SessionUIState } from "../../tui/shared/types.js";
import {
  getNextSessionIndex,
  getPrevSessionIndex,
  getDirectJumpIndex,
  getAdjustedIndexAfterRemoval,
} from "../../tui/shared/utils/sessionSwitching.js";

/**
 * Data structure representing a session in the queue.
 * Contains all metadata needed to render and interact with a session.
 */
export interface SessionData {
  /** Unique identifier for the session */
  sessionId: string;
  /** Filesystem path to the session file */
  sessionPath: string;
  /** The original session request containing questions */
  sessionRequest: SessionRequest;
  /** Unix timestamp when the session was created */
  timestamp: number;
  /** Optional session status (e.g., "abandoned") */
  status?: string;
  /** ISO 8601 timestamp string for display purposes */
  createdAt?: string;
}

/**
 * Options for configuring the session watcher behavior.
 */
export interface UseSessionWatcherOptions {
  /** Time in milliseconds before a session is considered stale (default: 2 hours) */
  staleThreshold?: number;
  /** Grace period after user interaction before stale check resumes (default: 30 minutes) */
  gracePeriod?: number;
  /** Callback invoked when a session becomes stale */
  onStaleDetected?: (session: SessionData) => void;
  /** Callback invoked when an abandoned session is detected */
  onAbandonedDetected?: (session: SessionData) => void;
}

/**
 * Return value from useSessionWatcher hook containing session state and actions.
 */
export interface UseSessionWatcherResult {
  /** FIFO queue of all active sessions */
  sessionQueue: SessionData[];
  /** Index of the currently active session in the queue */
  activeSessionIndex: number;
  /** The currently active session or null if queue is empty */
  activeSession: SessionData | null;
  /** Per-session UI state indexed by session ID */
  sessionUIStates: Record<string, SessionUIState>;
  /** Set the active session index directly */
  setActiveSessionIndex: (index: number) => void;
  /** Navigate to the next session (wraps around) */
  nextSession: () => void;
  /** Navigate to the previous session (wraps around) */
  prevSession: () => void;
  /** Jump directly to a session by index */
  jumpToSession: (index: number) => void;
  /** Remove a session from the queue by ID */
  removeSession: (sessionId: string) => void;
  /** Update UI state for a specific session */
  updateUIState: (sessionId: string, state: SessionUIState) => void;
  /** Add a new session to the queue */
  addSession: (session: SessionData) => void;
}

/**
 * React hook that bridges session events to React state for the OpenTUI renderer.
 * Manages session queue, active session index, and per-session UI state.
 */
export function useSessionWatcher(
  _options: UseSessionWatcherOptions = {},
): UseSessionWatcherResult {
  const [sessionQueue, setSessionQueue] = useState<SessionData[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [sessionUIStates, setSessionUIStates] = useState<
    Record<string, SessionUIState>
  >({});

  const sessionQueueRef = useRef(sessionQueue);
  sessionQueueRef.current = sessionQueue;

  const activeSessionIndexRef = useRef(activeSessionIndex);
  activeSessionIndexRef.current = activeSessionIndex;

  const activeSession = sessionQueue[activeSessionIndex] ?? null;

  const addSession = useCallback((session: SessionData) => {
    setSessionQueue((prev) => {
      // Don't add duplicates
      if (prev.some((s) => s.sessionId === session.sessionId)) return prev;
      return [...prev, session]; // FIFO: append to end
    });
  }, []);

  const removeSession = useCallback((sessionId: string) => {
    setSessionQueue((prev) => {
      const index = prev.findIndex((s) => s.sessionId === sessionId);
      if (index === -1) return prev;
      const newQueue = prev.filter((s) => s.sessionId !== sessionId);
      // Adjust active index after removal
      const newIndex = getAdjustedIndexAfterRemoval(
        index,
        activeSessionIndexRef.current,
        newQueue.length,
      );
      setActiveSessionIndex(newIndex);
      return newQueue;
    });
    // Clean up UI state
    setSessionUIStates((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }, []);

  const nextSession = useCallback(() => {
    setActiveSessionIndex((prev) =>
      getNextSessionIndex(prev, sessionQueueRef.current.length),
    );
  }, []);

  const prevSession = useCallback(() => {
    setActiveSessionIndex((prev) =>
      getPrevSessionIndex(prev, sessionQueueRef.current.length),
    );
  }, []);

  const jumpToSession = useCallback((index: number) => {
    const safeIndex = getDirectJumpIndex(
      index,
      activeSessionIndexRef.current,
      sessionQueueRef.current.length,
    );
    if (safeIndex !== null) setActiveSessionIndex(safeIndex);
  }, []);

  const updateUIState = useCallback(
    (sessionId: string, state: SessionUIState) => {
      setSessionUIStates((prev) => ({ ...prev, [sessionId]: state }));
    },
    [],
  );

  return {
    sessionQueue,
    activeSessionIndex,
    activeSession,
    sessionUIStates,
    setActiveSessionIndex,
    nextSession,
    prevSession,
    jumpToSession,
    removeSession,
    updateUIState,
    addSession,
  };
}
