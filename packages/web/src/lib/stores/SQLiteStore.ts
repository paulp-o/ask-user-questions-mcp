import type {
  SessionAnswer,
  SessionConfig,
  SessionRequest,
  SessionStatus,
  SessionStatusValue,
  SessionUpdate,
  StorageAdapter,
  StoredSession,
  SessionListFilter,
} from "@auq/core";
import { and, desc, eq } from "drizzle-orm";

import { createDatabaseConnection, resolveDatabasePath, type SqliteClient, type WebDatabase } from "../db";
import { initializeDatabase } from "../init";
import { sessionHistory, sessions } from "../schema";

type SQLiteStoreOptions = {
  databaseUrl?: string;
  config?: Partial<SessionConfig>;
};

const createStatusFromRow = (
  row: typeof sessions.$inferSelect,
  request: SessionRequest,
  overrides?: Partial<SessionStatus>,
): SessionStatus => {
  const status: SessionStatus = {
    sessionId: row.id,
    status: row.status as SessionStatusValue,
    createdAt: row.createdAt,
    lastModified: row.updatedAt,
    totalQuestions: request.questions.length,
    ...overrides,
  };

  if (request.callId) {
    status.callId = request.callId;
  }

  if (request.workingDirectory) {
    status.workingDirectory = request.workingDirectory;
  }

  if (row.rejectReason !== null) {
    status.rejectionReason = row.rejectReason;
  }

  return status;
};

const parseRow = (row: typeof sessions.$inferSelect): StoredSession => {
  const request = JSON.parse(row.request) as SessionRequest;
  const answers = row.answers ? (JSON.parse(row.answers) as SessionAnswer) : undefined;

  return {
    request,
    status: createStatusFromRow(row, request),
    ...(answers ? { answers } : {}),
  };
};

const isStateChangeEvent = (updates: SessionUpdate): boolean => {
  return Boolean(updates.status || updates.answers);
};

export class SQLiteStore implements StorageAdapter {
  private readonly config: SessionConfig;
  private db: WebDatabase;
  private sqlite: SqliteClient;

  constructor(options: SQLiteStoreOptions = {}) {
    this.config = {
      baseDir: resolveDatabasePath(options.databaseUrl),
      maxSessions: 100,
      retentionPeriod: 604800000,
      sessionTimeout: 0,
      ...options.config,
    };

    const { db, sqlite } = createDatabaseConnection(options.databaseUrl);
    this.db = db;
    this.sqlite = sqlite;
  }

  getConfig(): SessionConfig {
    return { ...this.config };
  }

  async initialize(): Promise<void> {
    await initializeDatabase(this.sqlite);
  }

  async shutdown(): Promise<void> {
    this.sqlite.close();
  }

  async create(request: SessionRequest): Promise<string> {
    if (!request.questions || request.questions.length === 0) {
      throw new Error("At least one question is required to create a session");
    }

    const timestamp = request.timestamp || new Date().toISOString();
    const statusValue = request.status || "pending";

    await this.db.insert(sessions).values({
      id: request.sessionId,
      request: JSON.stringify({ ...request, timestamp, status: statusValue }),
      status: statusValue,
      answers: null,
      rejectReason: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: null,
    });

    await this.db.insert(sessionHistory).values({
      sessionId: request.sessionId,
      event: "created",
      timestamp,
      metadata: null,
    });

    return request.sessionId;
  }

  async read(sessionId: string): Promise<StoredSession> {
    const row = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!row) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return parseRow(row);
  }

  async update(sessionId: string, updates: SessionUpdate): Promise<void> {
    const existing = await this.read(sessionId);
    const nextRequest = updates.request ?? existing.request;
    const nextStatus = updates.status ?? existing.status;
    const nextAnswers = updates.answers ?? existing.answers;
    const updatedAt = nextStatus.lastModified || new Date().toISOString();

    await this.db
      .update(sessions)
      .set({
        request: JSON.stringify(nextRequest),
        status: nextStatus.status,
        answers: nextAnswers ? JSON.stringify(nextAnswers) : null,
        rejectReason: nextStatus.rejectionReason ?? null,
        createdAt: nextStatus.createdAt,
        updatedAt,
        expiresAt: null,
      })
      .where(eq(sessions.id, sessionId));

    if (isStateChangeEvent(updates)) {
      await this.db.insert(sessionHistory).values({
        sessionId,
        event: updates.status?.status ?? (updates.answers ? "answered" : "updated"),
        timestamp: updatedAt,
        metadata: JSON.stringify({
          hasAnswers: Boolean(updates.answers),
          rejectionReason: updates.status?.rejectionReason ?? null,
        }),
      });
    }
  }

  async list(filter?: SessionListFilter): Promise<StoredSession[]> {
    const whereClause = filter?.status ? eq(sessions.status, filter.status) : undefined;

    const rows = await this.db
      .select()
      .from(sessions)
      .where(whereClause ? and(whereClause) : undefined)
      .orderBy(desc(sessions.createdAt));

    return rows.map((row) => parseRow(row));
  }

  async delete(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }
}