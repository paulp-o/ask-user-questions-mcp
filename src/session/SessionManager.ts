/**
 * SessionManager - Core session management for AskUserQuestions MCP server
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
// import { PromiseFileWatcher } from "./file-watcher.js";
import { ResponseFormatter } from "./ResponseFormatter.js";
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
   * Clean up old sessions that have exceeded the retention period (garbage collection)
   * This is different from session timeout - retention period determines when old
   * sessions are permanently deleted, regardless of their completion status.
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const sessionIds = await this.getAllSessionIds();
      let cleanedCount = 0;

      for (const sessionId of sessionIds) {
        const status = await this.getSessionStatus(sessionId);
        if (status && this.isSessionRetentionExpired(status)) {
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
   * Reject a session - mark as rejected by user
   * This allows users to skip unwanted question sets
   */
  async rejectSession(sessionId: string): Promise<void> {
    const exists = await this.sessionExists(sessionId);
    if (!exists) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update status to rejected
    await this.updateSessionStatus(sessionId, "rejected");
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
   * Start a complete session lifecycle from creation to formatted response
   *
   * This is the main orchestration method that:
   * 1. Creates a new session with the provided questions
   * 2. Waits for user to submit answers (with optional timeout)
   * 3. Reads and validates the answers
   * 4. Formats the response according to PRD specification
   * 5. Updates session status to completed
   * 6. Returns the formatted response for the AI model
   *
   * @param questions - Array of questions to ask the user
   * @returns Object containing sessionId and formatted response text
   * @throws Error if timeout occurs, validation fails, or file operations fail
   */
  async startSession(
    questions: Question[],
    callId?: string
  ): Promise<{
    formattedResponse: string;
    sessionId: string;
  }> {
    // Step 1: Create the session
    const sessionId = await this.createSession(questions);

    // Optionally attach callId metadata to request and status
    if (callId) {
      try {
        const req = await this.getSessionRequest(sessionId);
        if (req) {
          await this.writeSessionFile(sessionId, SESSION_FILES.REQUEST, {
            ...req,
            callId,
          } as SessionRequest);
        }

        const stat = await this.getSessionStatus(sessionId);
        if (stat) {
          await this.writeSessionFile(sessionId, SESSION_FILES.STATUS, {
            ...stat,
            callId,
          } as SessionStatus);
        }
      } catch (e) {
        console.warn("Failed to write callId metadata:", e);
      }
    }

    try {
      // Step 2: Calculate timeouts
      const sessionTimeout = this.config.sessionTimeout ?? 0; // 0 = infinite
      const watcherTimeout =
        sessionTimeout > 0
          ? Math.floor(sessionTimeout * 0.9) // 90% of session timeout
          : 0; // Also infinite if session is infinite

      // Step 3: Wait for answers with timeout
      try {
        await this.waitForAnswers(sessionId, watcherTimeout, callId);
      } catch (error) {
        // Check if session was rejected by user
        if (error instanceof Error && error.message === "SESSION_REJECTED") {
          // Return rejection message to MCP caller
          return {
            formattedResponse:
              "User rejected this question set and chose not to provide answers.",
            sessionId,
          };
        }

        // Watcher timeout occurred
        await this.updateSessionStatus(sessionId, "timed_out");
        throw new Error(
          `Session ${sessionId} timed out waiting for user response: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Step 4: Read and validate answers
      let answers;
      try {
        answers = await this.getSessionAnswers(sessionId);
      } catch (error) {
        // Handle JSON parse errors or other read failures
        await this.updateSessionStatus(sessionId, "abandoned");
        throw error;
      }

      if (!answers) {
        await this.updateSessionStatus(sessionId, "abandoned");
        throw new Error(
          `Answers file was created but is invalid for session ${sessionId}`
        );
      }

      const request = await this.getSessionRequest(sessionId);
      if (!request) {
        await this.updateSessionStatus(sessionId, "abandoned");
        throw new Error(`Session request not found: ${sessionId}`);
      }

      // Step 5: Validate answers match questions
      try {
        ResponseFormatter.validateAnswers(answers, request.questions);
      } catch (error) {
        await this.updateSessionStatus(sessionId, "abandoned");
        throw new Error(
          `Answer validation failed for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Step 6: Format the response according to PRD specification
      const formattedResponse = ResponseFormatter.formatUserResponse(
        answers,
        request.questions
      );

      // Step 7: Update final status
      await this.updateSessionStatus(sessionId, "completed");

      // Step 8: Return results
      return {
        formattedResponse,
        sessionId,
      };
    } catch (error) {
      // Ensure any errors are properly propagated with session context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Session ${sessionId} failed: ${String(error)}`);
    }
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
  async waitForAnswers(
    sessionId: string,
    timeoutMs?: number,
    expectedCallId?: string
  ): Promise<string> {
    const sessionDir = this.getSessionDir(sessionId);
    const answersPath = join(sessionDir, SESSION_FILES.ANSWERS);
    const startTime = Date.now();
    const pollInterval = 200; // ms

    // Poll for answers.json existence, guard against rejection and timeout
    // This avoids race conditions inherent in fs.watch when files are created before watch attaches
    // and isolates each MCP call purely by sessionId
    while (true) {
      // Check for answers
      if (await fileExists(answersPath)) {
        if (expectedCallId) {
          // Verify callId matches before resolving (defensive)
          try {
            const ans = await this.getSessionAnswers(sessionId);
            if (ans && (!ans.callId || ans.callId === expectedCallId)) {
              return sessionId;
            }
          } catch {
            // If read fails transiently, continue polling
          }
        } else {
          return sessionId;
        }
      }

      // Check for rejection
      const status = await this.getSessionStatus(sessionId);
      if (status && status.status === "rejected") {
        throw new Error("SESSION_REJECTED");
      }

      // Check for timeout
      if (timeoutMs && timeoutMs > 0 && Date.now() - startTime > timeoutMs) {
        throw new Error("Timeout waiting for user response");
      }

      // Sleep before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Poll status.json to detect if session was rejected
   * Throws error if status becomes "rejected"
   */
  private async pollForRejection(
    sessionId: string,
    timeoutMs: number
  ): Promise<never> {
    const startTime = Date.now();
    const pollInterval = 500; // Poll every 500ms

    while (true) {
      // Check for timeout
      if (timeoutMs > 0 && Date.now() - startTime > timeoutMs) {
        throw new Error("Timeout waiting for user response");
      }

      try {
        const status = await this.getSessionStatus(sessionId);
        if (status && status.status === "rejected") {
          throw new Error("SESSION_REJECTED");
        }
      } catch (error) {
        // If we can't read status, ignore and continue polling
        if (error instanceof Error && error.message === "SESSION_REJECTED") {
          throw error; // Re-throw rejection
        }
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
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
   * Check if a session has exceeded the retention period and should be garbage collected
   */
  private isSessionRetentionExpired(status: SessionStatus): boolean {
    const retentionPeriod = this.config.retentionPeriod ?? 604800000; // Default 7 days
    if (retentionPeriod <= 0) return false;

    // Check the more recent timestamp (lastModified or createdAt)
    // to determine if session is old enough for cleanup
    const recentTimestamp =
      status.lastModified > status.createdAt
        ? status.lastModified
        : status.createdAt;

    return isTimestampExpired(recentTimestamp, retentionPeriod);
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
