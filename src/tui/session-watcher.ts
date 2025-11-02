/**
 * TUI Session Watcher Module
 *
 * Provides TUI applications with the ability to detect new question sessions
 * and coordinate with the MCP server through file system events.
 */

import type { SessionRequest, SessionStatus } from "../session/types.js";

import { atomicReadFile } from "../session/atomic-operations.js";
import { TUISessionWatcher } from "../session/file-watcher.js";
import { SESSION_FILES } from "../session/types.js";

/**
 * Interface for TUI session events
 */
export interface TUISessionEvent {
  /** Session ID */
  sessionId: string;
  /** Session directory path */
  sessionPath: string;
  /** Session request data (for session-created events) */
  sessionRequest?: SessionRequest;
  /** Timestamp of the event */
  timestamp: number;
  /** Type of event */
  type: "session-completed" | "session-created" | "session-updated";
}

/**
 * Configuration for TUI session watcher
 */
export interface TUIWatcherConfig {
  /** Whether to automatically load session data when detected */
  autoLoadData?: boolean;
  /** Debounce time in milliseconds */
  debounceMs?: number;
  /** Custom session directory path (optional) */
  sessionDir?: string;
}

/**
 * Enhanced TUI Session Watcher with session data loading
 */
export class EnhancedTUISessionWatcher extends TUISessionWatcher {
  private autoLoadData: boolean;
  private eventHandlers: Map<string, (event: TUISessionEvent) => void> =
    new Map();

  constructor(config?: TUIWatcherConfig) {
    // Map sessionDir to baseDir for parent class
    super({
      baseDir: config?.sessionDir,
      debounceMs: config?.debounceMs,
    });
    this.autoLoadData = config?.autoLoadData ?? true;
  }

  /**
   * Add custom event handler
   */
  addEventHandler(
    name: string,
    handler: (event: TUISessionEvent) => void,
  ): void {
    this.eventHandlers.set(name, handler);
  }

  /**
   * Get list of pending sessions (sessions without answers and status is pending/in-progress)
   */
  async getPendingSessions(): Promise<string[]> {
    const fs = await import("fs/promises");
    const { join } = await import("path");

    try {
      const sessionDir = this.watchedPath;
      const entries = await fs.readdir(sessionDir, { withFileTypes: true });

      const pendingSessions: string[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const sessionPath = join(sessionDir, entry.name);
        const answersPath = join(sessionPath, SESSION_FILES.ANSWERS);
        const statusPath = join(sessionPath, SESSION_FILES.STATUS);

        try {
          // Check if answers file doesn't exist (pending session)
          await fs.access(answersPath);
        } catch {
          // Answers file doesn't exist - check status
          try {
            const statusContent = await fs.readFile(statusPath, "utf-8");
            const status = JSON.parse(statusContent) as SessionStatus;

            // Only include sessions that are actually pending or in-progress
            // Exclude: rejected, completed, timed_out, abandoned
            if (status.status === "pending" || status.status === "in-progress") {
              pendingSessions.push(entry.name);
            }
          } catch {
            // No valid status file - not a valid session
          }
        }
      }

      return pendingSessions.sort(); // Sort for consistent ordering
    } catch (error) {
      console.warn("Failed to scan for pending sessions:", error);
      return [];
    }
  }

  /**
   * Get session request data for a specific session
   */
  async getSessionRequest(sessionId: string): Promise<null | SessionRequest> {
    const { join } = await import("path");
    const sessionPath = join(this.watchedPath, sessionId);

    try {
      return await this.loadSessionRequest(sessionPath);
    } catch (error) {
      console.warn(`Failed to load session request for ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Check if a session exists and is pending
   */
  async isSessionPending(sessionId: string): Promise<boolean> {
    const { join } = await import("path");
    const sessionPath = join(this.watchedPath, sessionId);
    const answersPath = join(sessionPath, SESSION_FILES.ANSWERS);
    const statusPath = join(sessionPath, SESSION_FILES.STATUS);

    try {
      const fs = await import("fs/promises");

      // Check if status file exists (valid session)
      await fs.access(statusPath);

      // Check if answers file doesn't exist (pending)
      try {
        await fs.access(answersPath);
        return false; // Answers exist - session is completed
      } catch {
        return true; // No answers - session is pending
      }
    } catch {
      return false; // Not a valid session
    }
  }

  /**
   * Remove event handler
   */
  removeEventHandler(name: string): void {
    this.eventHandlers.delete(name);
  }

  /**
   * Start watching with enhanced event handling
   */
  startEnhancedWatching(
    onSessionEvent: (event: TUISessionEvent) => void,
  ): void {
    this.startWatching(async (sessionId, sessionPath) => {
      const event: TUISessionEvent = {
        sessionId,
        sessionPath,
        timestamp: Date.now(),
        type: "session-created",
      };

      // Auto-load session data if requested
      if (this.autoLoadData) {
        try {
          const sessionRequest = await this.loadSessionRequest(sessionPath);
          event.sessionRequest = sessionRequest;
        } catch (error) {
          console.warn(
            `Failed to load session request for ${sessionId}:`,
            error,
          );
        }
      }

      // Emit the event
      onSessionEvent(event);

      // Call any additional handlers
      this.eventHandlers.forEach((handler) => handler(event));
    });
  }

  /**
   * Load session request data from file
   */
  private async loadSessionRequest(
    sessionPath: string,
  ): Promise<SessionRequest> {
    const requestPath = `${sessionPath}/${SESSION_FILES.REQUEST}`;

    try {
      const content = await atomicReadFile(requestPath, {
        encoding: "utf8",
        maxRetries: 3,
        retryDelay: 100,
      });

      return JSON.parse(content) as SessionRequest;
    } catch (error) {
      throw new Error(
        `Failed to load session request from ${requestPath}: ${error}`,
      );
    }
  }
}

/**
 * Create a simple TUI session watcher instance
 */
export function createTUIWatcher(
  config?: TUIWatcherConfig,
): EnhancedTUISessionWatcher {
  return new EnhancedTUISessionWatcher(config);
}

/**
 * Convenience function to get the next pending session
 */
export async function getNextPendingSession(
  config?: TUIWatcherConfig,
): Promise<{ sessionId: string; sessionRequest: SessionRequest } | null> {
  const watcher = createTUIWatcher(config);
  const pendingSessions = await watcher.getPendingSessions();

  if (pendingSessions.length === 0) {
    return null;
  }

  // Try each pending session until we find one with valid data
  for (const sessionId of pendingSessions) {
    const sessionRequest = await watcher.getSessionRequest(sessionId);

    if (sessionRequest) {
      return { sessionId, sessionRequest };
    }
    // Skip corrupted sessions and continue to next one
  }

  // No valid sessions found
  return null;
}
