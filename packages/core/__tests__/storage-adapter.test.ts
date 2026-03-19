import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  StorageAdapter,
  StoredSession,
} from "../src/session/StorageAdapter.js";
import type {
  SessionAnswer,
  SessionRequest,
  SessionStatus,
} from "../src/shared/types.js";

const createRequest = (overrides: Partial<SessionRequest> = {}): SessionRequest => {
  const sessionId = overrides.sessionId ?? crypto.randomUUID();

  return {
    sessionId,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    status: overrides.status ?? "pending",
    questions: overrides.questions ?? [
      {
        title: "Language",
        prompt: "Pick a language",
        options: [{ label: "TypeScript" }, { label: "JavaScript" }],
      },
    ],
    callId: overrides.callId,
    workingDirectory: overrides.workingDirectory,
  };
};

const createStatus = (
  sessionId: string,
  status: SessionStatus["status"] = "pending",
): SessionStatus => ({
  sessionId,
  status,
  createdAt: new Date().toISOString(),
  lastModified: new Date().toISOString(),
  totalQuestions: 1,
});

const createAnswers = (sessionId: string): SessionAnswer => ({
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

const assertStoredSessionShape = (
  stored: StoredSession,
  request: SessionRequest,
): void => {
  expect(stored.request).toEqual(request);
  expect(stored.status.sessionId).toBe(request.sessionId);
  expect(stored.status.status).toBe(request.status);
};

export const runStorageAdapterTests = (
  createStore: () => StorageAdapter,
): void => {
  describe("StorageAdapter compliance", () => {
    let store: StorageAdapter;

    beforeEach(async () => {
      store = createStore();
      await store.initialize();
    });

    afterEach(async () => {
      await store.shutdown();
    });

    it("supports initialize and shutdown", async () => {
      await expect(store.initialize()).resolves.toBeUndefined();
      await expect(store.shutdown()).resolves.toBeUndefined();
    });

    it("creates a session and returns sessionId", async () => {
      const request = createRequest();

      const sessionId = await store.create(request);

      expect(sessionId).toBeTypeOf("string");
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it("reads full session data after create", async () => {
      const request = createRequest();
      const sessionId = await store.create(request);
      await store.update(sessionId, { answers: createAnswers(sessionId) });

      const stored = await store.read(sessionId);

      assertStoredSessionShape(stored, request);
    });

    it("updates existing session fields", async () => {
      const request = createRequest();
      const sessionId = await store.create(request);
      const answers = createAnswers(sessionId);
      const status = createStatus(sessionId, "completed");

      await store.update(sessionId, { answers, status });

      const updated = await store.read(sessionId);
      expect(updated.answers).toEqual(answers);
      expect(updated.status).toEqual(status);
      expect(updated.request).toEqual(request);
    });

    it("lists sessions without filter", async () => {
      const requestA = createRequest({ status: "pending" });
      const requestB = createRequest({ status: "completed" });

      const sessionIdA = await store.create(requestA);
      const sessionIdB = await store.create(requestB);
      await store.update(sessionIdA, { answers: createAnswers(sessionIdA) });
      await store.update(sessionIdB, { answers: createAnswers(sessionIdB) });

      const sessions = await store.list();

      const ids = sessions.map((session) => session.request.sessionId);
      expect(ids).toContain(requestA.sessionId);
      expect(ids).toContain(requestB.sessionId);
    });

    it("lists sessions with status filter", async () => {
      const pending = createRequest({ status: "pending" });
      const completed = createRequest({ status: "completed" });

      const pendingId = await store.create(pending);
      const completedId = await store.create(completed);
      await store.update(pendingId, { answers: createAnswers(pendingId) });
      await store.update(completedId, { answers: createAnswers(completedId) });

      const sessions = await store.list({ status: "completed" });

      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.request.sessionId).toBe(completed.sessionId);
      expect(sessions[0]?.status.status).toBe("completed");
    });

    it("deletes an existing session", async () => {
      const request = createRequest();
      const sessionId = await store.create(request);

      await store.delete(sessionId);

      await expect(store.read(sessionId)).rejects.toThrow();
    });

    it("throws when reading a non-existent session", async () => {
      await expect(store.read("does-not-exist")).rejects.toThrow();
    });

    it("handles deleting a non-existent session as throw or no-op", async () => {
      try {
        await store.delete("does-not-exist");
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
};

describe("storage-adapter test helper", () => {
  it("exports reusable compliance suite", () => {
    expect(runStorageAdapterTests).toBeTypeOf("function");
  });
});