import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionManager } from "../src/session/SessionManager.js";
import type {
  SessionListFilter,
  SessionUpdate,
  StorageAdapter,
  StoredSession,
} from "../src/session/StorageAdapter.js";
import { createSessionEventEmitter } from "../src/session/events.js";
import type { SessionRequest } from "../src/shared/types.js";

class MockStorageAdapter implements StorageAdapter {
  private sessions = new Map<string, StoredSession>();

  async initialize(): Promise<void> {}

  async shutdown(): Promise<void> {}

  async create(request: SessionRequest): Promise<string> {
    this.sessions.set(request.sessionId, {
      request,
      status: {
        sessionId: request.sessionId,
        status: request.status,
        createdAt: request.timestamp,
        lastModified: request.timestamp,
        totalQuestions: request.questions.length,
        callId: request.callId,
        workingDirectory: request.workingDirectory,
      },
    });

    return request.sessionId;
  }

  async read(sessionId: string): Promise<StoredSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return structuredClone(session);
  }

  async update(sessionId: string, updates: SessionUpdate): Promise<void> {
    const current = this.sessions.get(sessionId);
    if (!current) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    this.sessions.set(sessionId, {
      request: updates.request ?? current.request,
      status: updates.status ?? current.status,
      answers: updates.answers ?? current.answers,
    });
  }

  async list(filter?: SessionListFilter): Promise<StoredSession[]> {
    const all = [...this.sessions.values()].map((session) => structuredClone(session));
    if (!filter?.status) return all;
    return all.filter((session) => session.status.status === filter.status);
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

const questions = [
  {
    title: "Language",
    prompt: "Pick a language",
    options: [{ label: "TypeScript" }, { label: "JavaScript" }],
  },
];

describe("SessionManager", () => {
  let manager: SessionManager;
  let storage: MockStorageAdapter;
  let emitter: ReturnType<typeof createSessionEventEmitter>;
  let onCreated: ReturnType<typeof vi.fn>;
  let onAnswered: ReturnType<typeof vi.fn>;
  let onRejected: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    emitter = createSessionEventEmitter();
    onCreated = vi.fn();
    onAnswered = vi.fn();
    onRejected = vi.fn();
    emitter.on("session:created", onCreated);
    emitter.on("session:answered", onAnswered);
    emitter.on("session:rejected", onRejected);

    storage = new MockStorageAdapter();
    manager = new SessionManager({
      storage,
      events: emitter,
    });

    await manager.initialize();
  });

  it("creates a session", async () => {
    const sessionId = await manager.createSession(questions);
    const status = await manager.getSessionStatus(sessionId);

    expect(status).not.toBeNull();
    expect(status?.status).toBe("pending");
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onCreated.mock.calls[0]?.[0]).toBe(sessionId);
  });

  it("saves answers and marks completed", async () => {
    const sessionId = await manager.createSession(questions);
    await manager.saveSessionAnswers(sessionId, {
      sessionId,
      timestamp: new Date().toISOString(),
      answers: [
        {
          questionIndex: 0,
          selectedOption: "TypeScript",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const status = await manager.getSessionStatus(sessionId);
    const answers = await manager.getSessionAnswers(sessionId);

    expect(status?.status).toBe("completed");
    expect(answers?.answers).toHaveLength(1);
    expect(onAnswered).toHaveBeenCalledTimes(1);
    expect(onAnswered.mock.calls[0]?.[0]).toBe(sessionId);
  });

  it("rejects a session with reason", async () => {
    const sessionId = await manager.createSession(questions);
    await manager.rejectSession(sessionId, "not relevant");

    const status = await manager.getSessionStatus(sessionId);
    expect(status?.status).toBe("rejected");
    expect(status?.rejectionReason).toBe("not relevant");
    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(onRejected.mock.calls[0]?.[0]).toBe(sessionId);
    expect(onRejected.mock.calls[0]?.[1]).toBe("not relevant");
  });

  it("lists and gets sessions", async () => {
    const sessionId = await manager.createSession(questions);
    const all = await manager.getAllSessionIds();
    const pending = await manager.getPendingSessions();
    const session = await manager.getSession(sessionId);

    expect(all).toContain(sessionId);
    expect(pending).toContain(sessionId);
    expect(session.request.sessionId).toBe(sessionId);
  });

  it("cleans up expired sessions", async () => {
    const sessionId = await manager.createSession(questions);
    await manager.updateSessionStatus(sessionId, "completed", {
      createdAt: "2020-01-01T00:00:00.000Z",
      lastModified: "2020-01-01T00:00:00.000Z",
    });

    const expiringManager = new SessionManager({
      storage,
      events: emitter,
      config: { retentionPeriod: 1 },
    });

    const deleted = await expiringManager.cleanupExpiredSessions();
    expect(deleted).toBe(1);
    expect(await expiringManager.getSessionStatus(sessionId)).toBeNull();
  });
});