/**
 * SessionManager - Core session management for AskUserQuery MCP server
 */

import { promises as fs } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

import type {
  Question,
  SessionAnswer,
  SessionConfig,
  SessionRequest,
  SessionStatus,
} from "./types.js";

import {
  atomicDeleteFile,
  AtomicOperationError,
  AtomicReadError,
  atomicReadFile,
  AtomicWriteError,
  atomicWriteFile,
} from "./atomic-operations.js";
import { PromiseFileWatcher } from "./file-watcher.js";
import { DEFAULT_SESSION_CONFIG, SESSION_FILES } from "./types.js";
import {
  createSafeFilename,
  ensureDirectoryExists,
  fileExists,
  getCurrentTimestamp,
  isTimestampExpired,
  resolveSessionDirectory,
  sanitizeSessionId,
  validateSessionDirectory,
} from "./utils.js";

export class SessionManager {
  private baseDir: string;
  private config: SessionConfig;
  private fileWatcher?: PromiseFileWatcher;
  private sessionsDir: string;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      ...DEFAULT_SESSION_CONFIG,
      ...config,
    } as SessionConfig;

    // Resolve the directory path using XDG-compliant resolution
    this.baseDir = resolveSessionDirectory(this.config.baseDir);
    this.sessionsDir = this.baseDir;
  }

  /**
   * Clean up expired sessions (basic implementation for Subtask 1)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const sessionIds = await this.getAllSessionIds();
      let cleanedCount = 0;

      for (const sessionId of sessionIds) {
        const status = await this.getSessionStatus(sessionId);
        if (status && this.isSessionExpired(status)) {
          await this.deleteSession(sessionId);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.warn("Failed to cleanup expired sessions:", error);
      return 0;
    }
  }

  /**
   * Create a new session with unique ID
   */
  async createSession(questions: Question[]): Promise<string> {
    if (!questions || questions.length === 0) {
      throw new Error("At least one question is required to create a session");
    }

    const sessionId = uuidv4();
    const sessionDir = this.getSessionDir(sessionId);

    // Create session directory with secure permissions
    await ensureDirectoryExists(sessionDir);

    const timestamp = getCurrentTimestamp();

    // Create session request
    const sessionRequest: SessionRequest = {
      questions,
      sessionId,
      status: "pending",
      timestamp,
    };

    // Create session status
    const sessionStatus: SessionStatus = {
      createdAt: timestamp,
      lastModified: timestamp,
      sessionId,
      status: "pending",
      totalQuestions: questions.length,
    };

    // Write session files
    await Promise.all([
      this.writeSessionFile(sessionId, SESSION_FILES.REQUEST, sessionRequest),
      this.writeSessionFile(sessionId, SESSION_FILES.STATUS, sessionStatus),
    ]);

    return sessionId;
  }

  /**
   * Delete a session directory and all files using atomic operations
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.isValidSessionId(sessionId)) {
      throw new Error(`Invalid session ID format: ${sessionId}`);
    }

    const sessionDir = this.getSessionDir(sessionId);

    try {
      // Delete session files atomically
      const filesToDelete = [
        SESSION_FILES.REQUEST,
        SESSION_FILES.STATUS,
        SESSION_FILES.ANSWERS,
      ];

      for (const filename of filesToDelete) {
        const filePath = join(
          sessionDir,
          createSafeFilename(sessionId, filename)
        );
        try {
          await atomicDeleteFile(filePath);
        } catch (error) {
          // Ignore file not found errors during cleanup
          if (
            !(error as AtomicOperationError)?.cause?.message.includes("ENOENT")
          ) {
            console.warn(
              `Warning: Failed to delete session file ${filename}: ${error}`
            );
          }
        }
      }

      // Delete session directory
      await fs.rm(sessionDir, { force: true, recursive: true });
    } catch (error) {
      throw new Error(`Failed to delete session ${sessionId}: ${error}`);
    }
  }

  /**
   * Get all session IDs
   */
  async getAllSessionIds(): Promise<string[]> {
    try {
      return await fs.readdir(this.sessionsDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config };
  }

  /**
   * Get session answers
   */
  async getSessionAnswers(sessionId: string): Promise<null | SessionAnswer> {
    return this.readSessionFile<SessionAnswer>(
      sessionId,
      SESSION_FILES.ANSWERS
    );
  }

  /**
   * Get session count
   */
  async getSessionCount(): Promise<number> {
    const sessionIds = await this.getAllSessionIds();
    return sessionIds.length;
  }

  /**
   * Get session request (questions)
   */
  async getSessionRequest(sessionId: string): Promise<null | SessionRequest> {
    return this.readSessionFile<SessionRequest>(
      sessionId,
      SESSION_FILES.REQUEST
    );
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId: string): Promise<null | SessionStatus> {
    return this.readSessionFile<SessionStatus>(sessionId, SESSION_FILES.STATUS);
  }

  /**
   * Initialize the session manager - create base directories
   */
  async initialize(): Promise<void> {
    try {
      await ensureDirectoryExists(this.sessionsDir);

      // Validate the directory was created and is accessible
      const isValid = await validateSessionDirectory(this.sessionsDir);
      if (!isValid) {
        throw new Error(
          `Failed to create or access session directory: ${this.sessionsDir}`
        );
      }
    } catch (error) {
      throw new Error(`Failed to initialize session directories: ${error}`);
    }
  }

  /**
   * Check if maximum session limit is reached
   */
  async isSessionLimitReached(): Promise<boolean> {
    const maxSessions = this.config.maxSessions || 100;
    const currentCount = await this.getSessionCount();
    return currentCount >= maxSessions;
  }

  /**
   * Save session answers
   */
  async saveSessionAnswers(
    sessionId: string,
    answers: SessionAnswer
  ): Promise<void> {
    const exists = await this.sessionExists(sessionId);
    if (!exists) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await this.writeSessionFile(sessionId, SESSION_FILES.ANSWERS, answers);

    // Update session status to completed
    await this.updateSessionStatus(sessionId, "completed");
  }

  /**
   * Check if session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    // First validate session ID format
    if (!this.isValidSessionId(sessionId)) {
      return false;
    }

    const sessionDir = this.getSessionDir(sessionId);
    return await fileExists(sessionDir);
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: SessionStatus["status"],
    additionalData?: Partial<SessionStatus>
  ): Promise<void> {
    // First validate session ID format
    if (!this.isValidSessionId(sessionId)) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const currentStatus = await this.getSessionStatus(sessionId);
    if (!currentStatus) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updatedStatus: SessionStatus = {
      ...currentStatus,
      lastModified: getCurrentTimestamp(),
      status,
      ...additionalData,
    };

    await this.writeSessionFile(sessionId, SESSION_FILES.STATUS, updatedStatus);
  }

  /**
   * Validate session data integrity
   */
  async validateSession(sessionId: string): Promise<{
    issues: string[];
    isValid: boolean;
  }> {
    const issues: string[] = [];

    // Check if session exists
    if (!(await this.sessionExists(sessionId))) {
      issues.push("Session directory does not exist");
      return { issues, isValid: false };
    }

    // Check required files
    const requiredFiles = [SESSION_FILES.REQUEST, SESSION_FILES.STATUS];
    for (const filename of requiredFiles) {
      const filePath = join(
        this.getSessionDir(sessionId),
        createSafeFilename(sessionId, filename)
      );
      if (!(await fileExists(filePath))) {
        issues.push(`Required file missing: ${filename}`);
      }
    }

    // If any required files are missing, don't try to read them
    if (issues.length > 0) {
      return {
        issues,
        isValid: false,
      };
    }

    // Validate session status consistency
    const status = await this.getSessionStatus(sessionId);
    const request = await this.getSessionRequest(sessionId);

    if (status && request) {
      if (status.sessionId !== sessionId) {
        issues.push("Session ID mismatch in status file");
      }
      if (request.sessionId !== sessionId) {
        issues.push("Session ID mismatch in request file");
      }
      if (status.totalQuestions !== request.questions.length) {
        issues.push("Question count mismatch between status and request");
      }
    } else {
      issues.push("Could not read session status or request");
    }

    return {
      issues,
      isValid: issues.length === 0,
    };
  }

  /**
   * Wait for user answers to be submitted for a specific session
   * Returns the session ID when answers are detected, or rejects on timeout
   */
  async waitForAnswers(sessionId: string, timeoutMs?: number): Promise<string> {
    if (!this.fileWatcher) {
      this.fileWatcher = new PromiseFileWatcher({
        debounceMs: 100,
        ignoreInitial: true,
        timeoutMs: timeoutMs ?? 0, // 0 means infinite wait time by default
      });
    }

    const sessionDir = this.getSessionDir(sessionId);

    try {
      const answersPath = await this.fileWatcher.waitForFile(
        sessionDir,
        SESSION_FILES.ANSWERS
      );

      // Clean up the watcher after successful wait
      this.fileWatcher.cleanup();
      this.fileWatcher = undefined;

      // Verify the answers file exists and return the session ID
      console.debug(`Answers file created: ${answersPath}`);
      return sessionId;
    } catch (error) {
      // Clean up on error
      if (this.fileWatcher) {
        this.fileWatcher.cleanup();
        this.fileWatcher = undefined;
      }
      throw error;
    }
  }

  /**
   * Get session directory path for a given session ID
   */
  private getSessionDir(sessionId: string): string {
    return join(this.sessionsDir, sessionId);
  }

  /**
   * Check if a session is expired based on timeout
   */
  private isSessionExpired(status: SessionStatus): boolean {
    const timeout = this.config.sessionTimeout || 0;
    if (timeout <= 0) return false;

    return isTimestampExpired(status.lastModified, timeout);
  }

  /**
   * Validate session ID format
   */
  private isValidSessionId(sessionId: string): boolean {
    return sanitizeSessionId(sessionId);
  }

  /**
   * Read data from a session file using atomic operations
   */
  private async readSessionFile<T>(
    sessionId: string,
    filename: string,
    fallback: null | T = null
  ): Promise<null | T> {
    // First validate session ID format
    if (!this.isValidSessionId(sessionId)) {
      return fallback;
    }

    const safeFilename = createSafeFilename(sessionId, filename);
    const filePath = join(this.getSessionDir(sessionId), safeFilename);

    try {
      const content = await atomicReadFile(filePath, {
        encoding: "utf8",
        maxRetries: 3,
        retryDelay: 100,
      });

      try {
        return JSON.parse(content) as T;
      } catch (parseError) {
        throw new Error(
          `Failed to parse JSON from session file ${filename} for session ${sessionId}: ${parseError}`
        );
      }
    } catch (error) {
      if (error instanceof AtomicReadError) {
        // Check if the error is just that the file doesn't exist
        if (
          error.cause?.message.includes("File does not exist") ||
          error.message.includes("File does not exist")
        ) {
          return fallback;
        }
        throw new Error(
          `Failed to read session file ${filename} for session ${sessionId}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Write data to a session file using atomic operations
   */
  private async writeSessionFile<T>(
    sessionId: string,
    filename: string,
    data: T
  ): Promise<void> {
    const safeFilename = createSafeFilename(sessionId, filename);
    const filePath = join(this.getSessionDir(sessionId), safeFilename);

    try {
      await atomicWriteFile(filePath, JSON.stringify(data, null, 2), {
        encoding: "utf8",
        mode: 0o600,
      });
    } catch (error) {
      if (error instanceof AtomicWriteError) {
        throw new Error(
          `Failed to write session file ${filename} for session ${sessionId}: ${error.message}`
        );
      }
      throw error;
    }
  }
}
