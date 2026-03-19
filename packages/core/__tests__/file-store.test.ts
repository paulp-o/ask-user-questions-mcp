import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runStorageAdapterTests } from "./storage-adapter.test.js";
import type { SessionRequest } from "../src/shared/types.js";
import { FileStore } from "../src/session/stores/FileStore.js";

let testDir: string;

const createRequest = (overrides: Partial<SessionRequest> = {}): SessionRequest => {
  const sessionId = overrides.sessionId ?? crypto.randomUUID();

  return {
    sessionId,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    status: overrides.status ?? "pending",
    questions: overrides.questions ?? [
      {
        title: "Framework",
        prompt: "Pick a framework",
        options: [{ label: "React" }, { label: "Vue" }],
      },
    ],
    callId: overrides.callId,
    workingDirectory: overrides.workingDirectory,
  };
};

describe("FileStore", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "auq-file-store-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  runStorageAdapterTests(() => new FileStore({ baseDir: testDir }));

  it("writes request.json, status.json, and answers.json in session directory", async () => {
    const store = new FileStore({ baseDir: testDir });
    await store.initialize();

    const request = createRequest();
    const sessionId = await store.create(request);
    await store.update(sessionId, {
      answers: {
        sessionId,
        timestamp: new Date().toISOString(),
        answers: [
          {
            questionIndex: 0,
            selectedOption: "React",
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });

    const files = await readdir(join(testDir, sessionId));
    expect(files).toEqual(
      expect.arrayContaining(["request.json", "status.json", "answers.json"]),
    );

    await store.shutdown();
  });

  it("does not leave temporary files behind after writes", async () => {
    const store = new FileStore({ baseDir: testDir });
    await store.initialize();

    const request = createRequest();
    const sessionId = await store.create(request);
    await store.update(sessionId, {
      status: {
        sessionId,
        status: "completed",
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        totalQuestions: request.questions.length,
      },
    });

    const files = await readdir(join(testDir, sessionId));
    const tmpFiles = files.filter(
      (file) => file.includes(".tmp") || file.endsWith(".partial"),
    );

    expect(tmpFiles).toHaveLength(0);

    await store.shutdown();
  });

  it("throws when reading corrupt request.json", async () => {
    const store = new FileStore({ baseDir: testDir });
    await store.initialize();

    const request = createRequest();
    const sessionId = await store.create(request);

    const requestFile = join(testDir, sessionId, "request.json");
    await writeFile(requestFile, "{ invalid-json ", "utf8");

    await expect(store.read(sessionId)).rejects.toThrow();
    await store.shutdown();
  });
});