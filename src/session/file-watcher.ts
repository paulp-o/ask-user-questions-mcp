/**
 * File System Watching Module
 *
 * Provides cross-platform file system watching capabilities for both
 * MCP server and TUI coordination with proper debouncing and error handling.
 */

import { EventEmitter } from "events";
import { FSWatcher, watch } from "fs";
import { join } from "path";

import type { SessionConfig } from "./types.js";

import { resolveSessionDirectory } from "./utils.js";

/**
 * File system event with debouncing metadata
 */
export interface FileWatchEvent {
  /** Type of file system event */
  eventType: "change" | "rename";
  /** Path to the file that triggered the event */
  filePath: string;
  /** Whether this event is debounced */
  isDebounced?: boolean;
  /** Timestamp when the event occurred */
  timestamp: number;
}

/**
 * Configuration for file watching operations
 */
export interface WatchConfig {
  /** Debounce time in milliseconds to prevent duplicate events */
  debounceMs?: number;
  /** Whether to ignore initial file scan events */
  ignoreInitial?: boolean;
  /** Maximum time to wait for file changes before timeout */
  timeoutMs?: number;
}

/**
 * Promise-based file watcher for specific file patterns
 */
export class PromiseFileWatcher extends EventEmitter {
  private config: Required<WatchConfig>;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isWatching = false;
  private watchers: Map<string, FSWatcher> = new Map();

  constructor(config: WatchConfig = {}) {
    super();
    this.config = {
      debounceMs: config.debounceMs ?? 100,
      ignoreInitial: config.ignoreInitial ?? true,
      timeoutMs: config.timeoutMs ?? 30000, // 30 seconds default
    };
  }

  /**
   * Check if currently watching
   */
  active(): boolean {
    return this.isWatching;
  }

  /**
   * Clean up all watchers and timers
   */
  cleanup(): void {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close all file watchers
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();

    this.isWatching = false;
    this.removeAllListeners();
  }

  /**
   * Watch for a specific file to be created or modified
   * Returns a promise that resolves when the file is detected
   */
  async waitForFile(watchPath: string, fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const fullPath = join(watchPath, fileName);
      const timeoutId =
        this.config.timeoutMs > 0
          ? setTimeout(() => {
              this.cleanup();
              reject(new Error(`Timeout waiting for file: ${fullPath}`));
            }, this.config.timeoutMs)
          : undefined;

      try {
        // Set up file watcher
        const watcher = watch(
          watchPath,
          { persistent: false },
          (eventType, filename) => {
            if (!filename) return;

            const eventPath = join(watchPath, filename);

            // Check if this is the file we're waiting for
            if (filename === fileName || eventPath === fullPath) {
              this.handleFileEvent(eventType, eventPath);

              // Verify file exists and is accessible
              if (eventType === "rename") {
                // File was created - resolve the promise
                if (timeoutId) clearTimeout(timeoutId);
                this.cleanup();
                resolve(fullPath);
              }
            }
          }
        );

        this.watchers.set(watchPath, watcher);

        // Handle watcher errors
        watcher.on("error", (error) => {
          if (timeoutId) clearTimeout(timeoutId);
          this.cleanup();
          reject(new Error(`File watcher error: ${error.message}`));
        });

        this.isWatching = true;
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        reject(new Error(`File watcher setup error: ${error}`));
      }
    });
  }

  /**
   * Watch a directory for new session directories
   * Emits events when new directories are created
   */
  watchForSessions(
    sessionDirPath: string,
    onSessionCreated: (sessionId: string, sessionPath: string) => void
  ): void {
    try {
      const watcher = watch(
        sessionDirPath,
        { persistent: false },
        (eventType, filename) => {
          if (!filename || eventType !== "rename") return;

          const fullPath = join(sessionDirPath, filename);

          // Debounce rapid events
          this.debounceEvent(fullPath, () => {
            // Check if this is a new directory (potential session)
            this.handleSessionEvent(fullPath, onSessionCreated);
          });
        }
      );

      this.watchers.set(sessionDirPath, watcher);

      watcher.on("error", (error) => {
        this.emit(
          "error",
          new Error(`Session watcher error: ${error.message}`)
        );
      });

      this.isWatching = true;
    } catch (error) {
      this.emit("error", new Error(`Session watcher setup error: ${error}`));
    }
  }

  /**
   * Debounce file system events to prevent duplicates
   */
  private debounceEvent(eventKey: string, callback: () => void): void {
    // Clear existing timer for this event
    const existingTimer = this.debounceTimers.get(eventKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(eventKey);
      callback();
    }, this.config.debounceMs);

    this.debounceTimers.set(eventKey, timer);
  }

  /**
   * Handle file system events with debouncing
   */
  private handleFileEvent(eventType: string, filePath: string): void {
    const event: FileWatchEvent = {
      eventType: eventType as "change" | "rename",
      filePath,
      timestamp: Date.now(),
    };

    this.emit("fileEvent", event);
  }

  /**
   * Handle new session directory creation
   */
  private async handleSessionEvent(
    sessionPath: string,
    onSessionCreated: (sessionId: string, sessionPath: string) => void
  ): Promise<void> {
    try {
      // Check if this is actually a directory and has session files
      const stats = await import("fs").then((fs) =>
        fs.promises.stat(sessionPath)
      );
      if (!stats.isDirectory()) return;

      // Extract session ID from directory name
      const sessionId = sessionPath.split("/").pop() ?? "";
      if (!sessionId) return;

      // Verify it's a valid session (has request.json)
      const requestFile = join(sessionPath, "request.json");
      try {
        await import("fs").then((fs) => fs.promises.access(requestFile));
        onSessionCreated(sessionId, sessionPath);
      } catch {
        // Not a valid session directory
        return;
      }
    } catch {
      // Error accessing directory - ignore
      return;
    }
  }
}

/**
 * TUI Session Watcher -专门用于 TUI 检测新会话
 */
export class TUISessionWatcher {
  /**
   * Get the session directory path being watched
   */
  get watchedPath(): string {
    return this.sessionDirPath;
  }
  private fileWatcher: PromiseFileWatcher;

  private sessionDirPath: string;

  constructor(config?: Partial<SessionConfig & WatchConfig>) {
    // Resolve session directory using XDG-compliant path
    const sessionConfig = {
      baseDir: config?.baseDir ?? "~/.local/share/auq/sessions",
    };
    this.sessionDirPath = resolveSessionDirectory(sessionConfig.baseDir);

    this.fileWatcher = new PromiseFileWatcher({
      debounceMs: config?.debounceMs ?? 200,
      ignoreInitial: config?.ignoreInitial ?? true,
      timeoutMs: config?.timeoutMs ?? 60000, // 1 minute for TUI
    });
  }

  /**
   * Start watching for new sessions
   */
  startWatching(
    onNewSession: (sessionId: string, sessionPath: string) => void
  ): void {
    this.fileWatcher.watchForSessions(this.sessionDirPath, onNewSession);
  }

  /**
   * Stop watching and clean up
   */
  stop(): void {
    this.fileWatcher.cleanup();
  }
}
