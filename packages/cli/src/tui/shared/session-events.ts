/**
 * Shared session event types for both ink and OpenTUI TUI implementations.
 */

/** Event emitted when a session changes state */
export interface TUISessionEvent {
  /** Session ID */
  sessionId: string;
  /** Session directory path */
  sessionPath: string;
  /** Session request data (for session-created events) */
  sessionRequest?: import("../../session/types.js").SessionRequest;
  /** Timestamp of the event */
  timestamp: number;
  /** Type of event */
  type: "session-completed" | "session-created" | "session-updated";
}

/** Metadata for a pending session */
export interface PendingSessionMeta {
  /** Session ID (directory name) */
  sessionId: string;
  /** Current session status from status.json */
  status: string;
  /** ISO-8601 creation timestamp from status.json */
  createdAt: string;
}

/** Session event handler callback type */
export type SessionEventHandler = (event: TUISessionEvent) => void;

/**
 * Interface for session watcher event emitter.
 * Both ink and OpenTUI adapters implement this to receive session events.
 */
export interface SessionEventEmitter {
  on(event: "session-added", handler: (session: TUISessionEvent) => void): void;
  on(event: "session-removed", handler: (sessionId: string) => void): void;
  on(event: "session-updated", handler: (session: TUISessionEvent) => void): void;
}

/**
 * Shared SessionWatcher type defining the public API
 * that both renderers can depend on.
 */
export interface SessionWatcherAPI {
  getPendingSessions(): Promise<string[]>;
  getPendingSessionsWithStatus(): Promise<PendingSessionMeta[]>;
  getSessionRequest(
    sessionId: string,
  ): Promise<import("../../session/types.js").SessionRequest | null>;
  isSessionPending(sessionId: string): Promise<boolean>;
  startEnhancedWatching(onSessionEvent: SessionEventHandler): void;
  stopWatching(): void;
}