import { promises as fs } from "fs";
import { join } from "path";

import {
  atomicDeleteFile,
  AtomicOperationError,
  AtomicReadError,
  AtomicWriteError,
  atomicReadFile,
  atomicWriteFile,
} from "../atomic-operations.js";
import {
  DEFAULT_SESSION_CONFIG,
  SESSION_FILES,
  type SessionConfig,
  type SessionRequest,
  type SessionStatus,
} from "../../shared/types.js";
import type { SessionAnswer } from "../../shared/types.js";
import type {
  SessionListFilter,
  SessionUpdate,
  StorageAdapter,
  StoredSession,
} from "../StorageAdapter.js";
import {
  createSafeFilename,
  ensureDirectoryExists,
  fileExists,
  getCurrentTimestamp,
  resolveSessionDirectory,
  sanitizeSessionId,
  validateSessionDirectory,
} from "../utils.js";

export class FileStore implements StorageAdapter {
  private readonly baseDir: string;
  private readonly config: SessionConfig;
  private readonly sessionsDir: string;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config } as SessionConfig;
    this.baseDir = resolveSessionDirectory(this.config.baseDir);
    this.sessionsDir = this.baseDir;
  }

  getConfig(): SessionConfig {
    return { ...this.config };
  }

  async initialize(): Promise<void> {
    await ensureDirectoryExists(this.sessionsDir);

    const isValid = await validateSessionDirectory(this.sessionsDir);
    if (!isValid) {
      throw new Error(
        `Failed to create or access session directory: ${this.sessionsDir}`,
      );
    }
  }

  async shutdown(): Promise<void> {}

  async create(request: SessionRequest): Promise<string> {
    if (!this.isValidSessionId(request.sessionId)) {
      throw new Error(`Invalid session ID format: ${request.sessionId}`);
    }

    if (!request.questions || request.questions.length === 0) {
      throw new Error("At least one question is required to create a session");
    }

    const sessionId = request.sessionId;
    const sessionDir = this.getSessionDir(sessionId);
    await ensureDirectoryExists(sessionDir);

    const timestamp = request.timestamp || getCurrentTimestamp();
    const status: SessionStatus = {
      createdAt: timestamp,
      lastModified: timestamp,
      sessionId,
      status: request.status || "pending",
      totalQuestions: request.questions.length,
      ...(request.callId && { callId: request.callId }),
      ...(request.workingDirectory && { workingDirectory: request.workingDirectory }),
    };

    const normalizedRequest: SessionRequest = {
      ...request,
      timestamp,
      status: request.status || "pending",
    };

    await Promise.all([
      this.writeSessionFile(sessionId, SESSION_FILES.REQUEST, normalizedRequest),
      this.writeSessionFile(sessionId, SESSION_FILES.STATUS, status),
    ]);

    return sessionId;
  }

  async read(sessionId: string): Promise<StoredSession> {
    const request = await this.readSessionFile<SessionRequest>(
      sessionId,
      SESSION_FILES.REQUEST,
    );
    const status = await this.readSessionFile<SessionStatus>(
      sessionId,
      SESSION_FILES.STATUS,
    );
    const answers = await this.readSessionFile<SessionAnswer>(
      sessionId,
      SESSION_FILES.ANSWERS,
    );

    if (!request || !status) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      ...(answers && { answers }),
      request,
      status,
    };
  }

  async update(sessionId: string, updates: SessionUpdate): Promise<void> {
    if (!this.isValidSessionId(sessionId)) {
      throw new Error(`Invalid session ID format: ${sessionId}`);
    }

    if (!(await this.sessionExists(sessionId))) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (updates.request) {
      await this.writeSessionFile(sessionId, SESSION_FILES.REQUEST, updates.request);
    }

    if (updates.status) {
      await this.writeSessionFile(sessionId, SESSION_FILES.STATUS, updates.status);
    }

    if (updates.answers) {
      await this.writeSessionFile(sessionId, SESSION_FILES.ANSWERS, updates.answers);
    }
  }

  async list(filter?: SessionListFilter): Promise<StoredSession[]> {
    let sessionIds: string[] = [];

    try {
      sessionIds = await fs.readdir(this.sessionsDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }

    const sessions = await Promise.all(
      sessionIds
        .filter((sessionId) => this.isValidSessionId(sessionId))
        .map(async (sessionId): Promise<null | StoredSession> => {
          try {
            const status = await this.readSessionFile<SessionStatus>(
              sessionId,
              SESSION_FILES.STATUS,
            );
            if (!status) {
              return null;
            }

            if (filter?.status && status.status !== filter.status) {
              return null;
            }

            const request = await this.readSessionFile<SessionRequest>(
              sessionId,
              SESSION_FILES.REQUEST,
            );
            if (!request) {
              return null;
            }

            const answers = await this.readSessionFile<SessionAnswer>(
              sessionId,
              SESSION_FILES.ANSWERS,
            );

            return {
              ...(answers && { answers }),
              request,
              status,
            };
          } catch {
            return null;
          }
        }),
    );

    return sessions.filter((session): session is StoredSession => session !== null);
  }

  async delete(sessionId: string): Promise<void> {
    if (!this.isValidSessionId(sessionId)) {
      throw new Error(`Invalid session ID format: ${sessionId}`);
    }

    const sessionDir = this.getSessionDir(sessionId);
    const filesToDelete = [
      SESSION_FILES.REQUEST,
      SESSION_FILES.STATUS,
      SESSION_FILES.ANSWERS,
    ];

    for (const filename of filesToDelete) {
      const filePath = join(sessionDir, createSafeFilename(sessionId, filename));
      try {
        await atomicDeleteFile(filePath);
      } catch (error) {
        if (!(error as AtomicOperationError)?.cause?.message.includes("ENOENT")) {
          throw error;
        }
      }
    }

    await fs.rm(sessionDir, { force: true, recursive: true });
  }

  private getSessionDir(sessionId: string): string {
    return join(this.sessionsDir, sessionId);
  }

  private isValidSessionId(sessionId: string): boolean {
    return sanitizeSessionId(sessionId);
  }

  private async readSessionFile<T>(
    sessionId: string,
    filename: string,
    fallback: null | T = null,
  ): Promise<null | T> {
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
          `Failed to parse JSON from session file ${filename} for session ${sessionId}: ${parseError}`,
        );
      }
    } catch (error) {
      if (error instanceof AtomicReadError) {
        if (
          error.cause?.message.includes("File does not exist") ||
          error.message.includes("File does not exist")
        ) {
          return fallback;
        }
        throw new Error(
          `Failed to read session file ${filename} for session ${sessionId}: ${error.message}`,
        );
      }
      throw error;
    }
  }

  private async sessionExists(sessionId: string): Promise<boolean> {
    if (!this.isValidSessionId(sessionId)) {
      return false;
    }

    const sessionDir = this.getSessionDir(sessionId);
    return await fileExists(sessionDir);
  }

  private async writeSessionFile<T>(
    sessionId: string,
    filename: string,
    data: T,
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
          `Failed to write session file ${filename} for session ${sessionId}: ${error.message}`,
        );
      }
      throw error;
    }
  }
}