import { describe, expect, it } from "vitest";

import { runStorageAdapterTests } from "../../core/__tests__/storage-adapter.test";
import type { SessionAnswer, SessionRequest } from "@auq/core";

import { SQLiteStore } from "../src/lib/stores/SQLiteStore";

runStorageAdapterTests(() => new SQLiteStore({ databaseUrl: ":memory:" }));

describe("SQLiteStore", () => {
  it("serializes and deserializes request and answers JSON", async () => {
    const store = new SQLiteStore({ databaseUrl: ":memory:" });
    await store.initialize();

    const request: SessionRequest = {
      sessionId: crypto.randomUUID(),
      status: "pending",
      timestamp: new Date().toISOString(),
      callId: "call-123",
      workingDirectory: "/tmp/project",
      questions: [
        {
          title: "Stack",
          prompt: "Choose stack",
          multiSelect: true,
          options: [
            { label: "TypeScript", description: "Typed JS" },
            { label: "Go" },
          ],
        },
      ],
    };

    const answers: SessionAnswer = {
      sessionId: request.sessionId,
      timestamp: new Date().toISOString(),
      answers: [
        {
          questionIndex: 0,
          selectedOptions: ["TypeScript", "Go"],
          customText: "plus Rust",
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const sessionId = await store.create(request);
    await store.update(sessionId, { answers });

    const stored = await store.read(sessionId);
    expect(stored.request).toEqual(request);
    expect(stored.answers).toEqual(answers);

    await store.shutdown();
  });
});