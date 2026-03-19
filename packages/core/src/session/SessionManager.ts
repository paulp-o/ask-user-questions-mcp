import { v4 as uuidv4 } from "uuid";

import type { StorageAdapter, StoredSession } from "./StorageAdapter.js";
import { createSessionEventEmitter, type SessionEventEmitter } from "./events.js";
import { isTimestampExpired, sanitizeSessionId } from "./utils.js";
import { ResponseFormatter } from "./ResponseFormatter.js";
import { DEFAULT_SESSION_CONFIG, type Question, type SessionAnswer, type SessionConfig, type SessionRequest, type SessionStatus } from "../shared/types.js";

export type SessionManagerOptions = {
  storage: StorageAdapter;
  events?: SessionEventEmitter;
  config?: Partial<SessionConfig>;
};

export class SessionManager {
  private readonly storage: StorageAdapter;
  private readonly events: SessionEventEmitter;
  private readonly config: SessionConfig;

  constructor(options: SessionManagerOptions) {
    this.storage = options.storage;
    this.events = options.events ?? createSessionEventEmitter();
    this.config = { ...DEFAULT_SESSION_CONFIG, ...options.storage.getConfig?.(), ...options.config } as SessionConfig;
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const sessions = await this.storage.list();
      let cleanedCount = 0;

      for (const session of sessions) {
        if (this.isSessionRetentionExpired(session.status)) {
          await this.storage.delete(session.request.sessionId);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.warn("Failed to cleanup expired sessions:", error);
      return 0;
    }
  }

  async createSession(
    questions: Question[],
    workingDirectory?: string,
  ): Promise<string> {
    if (!questions || questions.length === 0) {
      throw new Error("At least one question is required to create a session");
    }

    const sessionId = uuidv4();
    const timestamp = new Date().toISOString();

    const request: SessionRequest = {
      questions,
      sessionId,
      status: "pending",
      timestamp,
      ...(workingDirectory && { workingDirectory }),
    };

    await this.storage.create(request);
    this.events.emit("session:created", sessionId, request);
    return sessionId;
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.isValidSessionId(sessionId)) {
      throw new Error(`Invalid session ID format: ${sessionId}`);
    }
    await this.storage.delete(sessionId);
  }

  async getAllSessionIds(): Promise<string[]> {
    const sessions = await this.storage.list();
    return sessions.map((session) => session.request.sessionId);
  }

  getConfig(): SessionConfig {
    return { ...this.config };
  }

  async getSession(sessionId: string): Promise<StoredSession> {
    return this.storage.read(sessionId);
  }

  async getSessionAnswers(sessionId: string): Promise<null | SessionAnswer> {
    try {
      return (await this.storage.read(sessionId)).answers ?? null;
    } catch {
      return null;
    }
  }

  async getPendingSessions(options?: { includeAbandoned?: boolean }): Promise<string[]> {
    const sessions = await this.storage.list();
    return sessions
      .filter((session) => {
        const isPending =
          session.status.status === "pending" || session.status.status === "in-progress";
        const isAbandoned = session.status.status === "abandoned";
        return isPending || (options?.includeAbandoned && isAbandoned);
      })
      .map((session) => session.request.sessionId);
  }

  async getUnreadSessions(): Promise<string[]> {
    const sessions = await this.storage.list({ status: "completed" });
    return sessions
      .filter((session) => session.answers && !session.answers.lastReadAt)
      .sort((a, b) => b.status.createdAt.localeCompare(a.status.createdAt))
      .map((session) => session.request.sessionId);
  }

  async markSessionAsRead(sessionId: string): Promise<SessionAnswer> {
    const stored = await this.storage.read(sessionId);
    if (!stored.answers) {
      throw new Error(`Session ${sessionId} has no answers to mark as read`);
    }

    const answers: SessionAnswer = {
      ...stored.answers,
      lastReadAt: new Date().toISOString(),
    };

    await this.storage.update(sessionId, { answers });
    return answers;
  }

  async getSessionCount(): Promise<number> {
    const sessions = await this.storage.list();
    return sessions.length;
  }

  async getSessionRequest(sessionId: string): Promise<null | SessionRequest> {
    try {
      return (await this.storage.read(sessionId)).request;
    } catch {
      return null;
    }
  }

  async getSessionStatus(sessionId: string): Promise<null | SessionStatus> {
    try {
      return (await this.storage.read(sessionId)).status;
    } catch {
      return null;
    }
  }

  async isAbandoned(sessionId: string): Promise<boolean> {
    const status = await this.getSessionStatus(sessionId);
    return status?.status === "abandoned";
  }

  async isSessionLimitReached(): Promise<boolean> {
    const maxSessions = this.config.maxSessions || 100;
    const currentCount = await this.getSessionCount();
    return currentCount >= maxSessions;
  }

  async saveSessionAnswers(
    sessionId: string,
    answers: SessionAnswer,
  ): Promise<void> {
    if (!(await this.sessionExists(sessionId))) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await this.storage.update(sessionId, { answers });
    await this.updateSessionStatus(sessionId, "completed");
    this.events.emit("session:answered", sessionId, answers.answers);
  }

  async rejectSession(
    sessionId: string,
    reason?: string | null,
  ): Promise<void> {
    if (!(await this.sessionExists(sessionId))) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await this.updateSessionStatus(sessionId, "rejected", { rejectionReason: reason || null });
    this.events.emit("session:rejected", sessionId, reason ?? undefined);
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    if (!this.isValidSessionId(sessionId)) {
      return false;
    }

    try {
      await this.storage.read(sessionId);
      return true;
    } catch {
      return false;
    }
  }

  async startSession(
    questions: Question[],
    callId?: string,
    workingDirectory?: string,
    signal?: AbortSignal,
  ): Promise<{
    formattedResponse: string;
    sessionId: string;
  }> {
    const sessionId = await this.createSession(questions, workingDirectory);

    let abortHandler: (() => void) | undefined;
    if (signal) {
      if (signal.aborted) {
        await this.updateSessionStatus(sessionId, "abandoned");
        throw new Error("ABORTED");
      }

      abortHandler = () => {
        this.updateSessionStatus(sessionId, "abandoned").catch(() => {});
      };
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    if (callId || workingDirectory) {
      try {
        const current = await this.storage.read(sessionId);
        await this.storage.update(sessionId, {
          request: {
            ...current.request,
            ...(callId && { callId }),
            ...(workingDirectory && { workingDirectory }),
          },
          status: {
            ...current.status,
            ...(callId && { callId }),
            ...(workingDirectory && { workingDirectory }),
          },
        });
      } catch (error) {
        console.warn("Failed to write metadata:", error);
      }
    }

    try {
      const sessionTimeout = this.config.sessionTimeout ?? 0;
      const watcherTimeout = sessionTimeout > 0 ? Math.floor(sessionTimeout * 0.9) : 0;

      try {
        await this.waitForAnswers(sessionId, watcherTimeout, callId, signal);
      } catch (error) {
        if (error instanceof Error && error.message === "ABORTED") {
          if (abortHandler && signal) {
            signal.removeEventListener("abort", abortHandler);
          }
          throw error;
        }

        if (error instanceof Error && error.message === "SESSION_REJECTED") {
          if (abortHandler && signal) {
            signal.removeEventListener("abort", abortHandler);
          }

          const status = await this.getSessionStatus(sessionId);
          const reason = status?.rejectionReason;

          let formattedResponse = "User rejected this question set.\n\n";
          if (reason) {
            formattedResponse += `Rejection reason: \"${reason}\"\n\n`;
          } else {
            formattedResponse += "No reason provided.\n\n";
          }

          return { formattedResponse, sessionId };
        }

        await this.updateSessionStatus(sessionId, "timed_out");
        this.events.emit("session:timeout", sessionId);
        throw new Error(
          `Session ${sessionId} timed out waiting for user response: ${error instanceof Error ? error.message : String(error)}`,
);
      }

      const answers = await this.getSessionAnswers(sessionId);
      if (!answers) {
        await this.updateSessionStatus(sessionId, "abandoned");
        throw new Error(`Answers file was created but is invalid for session ${sessionId}`);
      }

      const request = await this.getSessionRequest(sessionId);
      if (!request) {
        await this.updateSessionStatus(sessionId, "abandoned");
        throw new Error(`Session request not found: ${sessionId}`);
      }

      try {
        ResponseFormatter.validateAnswers(answers, request.questions);
      } catch (error) {
        await this.updateSessionStatus(sessionId, "abandoned");
        throw new Error(
          `Answer validation failed for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
);
      }

      const formattedResponse = ResponseFormatter.formatUserResponse(
        answers,
        request.questions,
      );

      await this.updateSessionStatus(sessionId, "completed");

      if (abortHandler && signal) {
        signal.removeEventListener("abort", abortHandler);
      }

      return { formattedResponse, sessionId };
    } catch (error) {
      if (abortHandler && signal) {
        signal.removeEventListener("abort", abortHandler);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Session ${sessionId} failed: ${String(error)}`);
    }
  }

  async updateSessionStatus(
    sessionId: string,
    status: SessionStatus["status"],
    additionalData?: Partial<SessionStatus>,
  ): Promise<void> {
    if (!this.isValidSessionId(sessionId)) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const current = await this.storage.read(sessionId);
    const updatedStatus: SessionStatus = {
      ...current.status,
      lastModified: new Date().toISOString(),
      status,
      ...additionalData,
    };

    await this.storage.update(sessionId, { status: updatedStatus });
  }

  async validateSession(sessionId: string): Promise<{
    issues: string[];
    isValid: boolean;
  }> {
    const issues: string[] = [];

    if (!(await this.sessionExists(sessionId))) {
      issues.push("Session directory does not exist");
      return { issues, isValid: false };
    }

    const stored = await this.storage.read(sessionId);
    if (stored.status.sessionId !== sessionId) {
      issues.push("Session ID mismatch in status file");
    }
    if (stored.request.sessionId !== sessionId) {
      issues.push("Session ID mismatch in request file");
    }
    if (stored.status.totalQuestions !== stored.request.questions.length) {
      issues.push("Question count mismatch between status and request");
    }

    return {
      issues,
      isValid: issues.length === 0,
    };
  }

  async waitForAnswers(
    sessionId: string,
    timeoutMs?: number,
    expectedCallId?: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const startTime = Date.now();
    const pollInterval = 200;

    while (true) {
      const stored = await this.storage.read(sessionId);

      if (stored.answers) {
        if (expectedCallId) {
          if (!stored.answers.callId || stored.answers.callId === expectedCallId) {
            return sessionId;
          }
        } else {
          return sessionId;
        }
      }

      if (stored.status.status === "rejected") {
        throw new Error("SESSION_REJECTED");
      }

      if (signal?.aborted) {
        throw new Error("ABORTED");
      }

      if (timeoutMs && timeoutMs > 0 && Date.now() - startTime > timeoutMs) {
        throw new Error("Timeout waiting for user response");
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  private isSessionRetentionExpired(status: SessionStatus): boolean {
    const retentionPeriod = this.config.retentionPeriod ?? 604800000;
    if (retentionPeriod <= 0) return false;

    const recentTimestamp =
      status.lastModified > status.createdAt
        ? status.lastModified
        : status.createdAt;

    return isTimestampExpired(recentTimestamp, retentionPeriod);
  }

  private isValidSessionId(sessionId: string): boolean {
    return sanitizeSessionId(sessionId);
  }
}