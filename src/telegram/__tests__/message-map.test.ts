import { promises as fs } from "fs";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getTelegramMessageMapEntry,
  readTelegramMessageMapEntries,
  setTelegramMessageMapState,
  upsertTelegramMessageMapEntry,
  writeTelegramMessageMapEntries,
} from "../message-map.js";

describe("telegram message map", () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) {
      const dir = dirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
    delete process.env.XDG_CONFIG_HOME;
  });

  it("upserts entries by session and question index", async () => {
    const dir = mkdtempSync(join(tmpdir(), "auq-message-map-"));
    dirs.push(dir);
    process.env.XDG_CONFIG_HOME = dir;

    const entry = {
      sessionId: "session-1",
      questionIndex: 0,
      chatId: "123",
      messageId: 100,
      lastSyncedHash: "hash-1",
      state: "active" as const,
    };

    await upsertTelegramMessageMapEntry(entry);
    await upsertTelegramMessageMapEntry({
      ...entry,
      messageId: 200,
      lastSyncedHash: "hash-2",
      state: "completed",
    });

    expect(await readTelegramMessageMapEntries()).toEqual([
      {
        sessionId: "session-1",
        questionIndex: 0,
        chatId: "123",
        messageId: 200,
        lastSyncedHash: "hash-2",
        state: "completed",
      },
    ]);
  });

  it("can update entry state to stale", async () => {
    const dir = mkdtempSync(join(tmpdir(), "auq-message-map-"));
    dirs.push(dir);
    process.env.XDG_CONFIG_HOME = dir;

    await writeTelegramMessageMapEntries([
      {
        sessionId: "session-2",
        questionIndex: 1,
        chatId: "-100",
        messageId: 42,
        lastSyncedHash: "hash-3",
        state: "active",
      },
    ]);

    const updated = await setTelegramMessageMapState(
      "session-2",
      1,
      "stale",
    );

    expect(updated).toEqual({
      sessionId: "session-2",
      questionIndex: 1,
      chatId: "-100",
      messageId: 42,
      lastSyncedHash: "hash-3",
      state: "stale",
    });
    expect(await getTelegramMessageMapEntry("session-2", 1)).toEqual(updated);
  });

  it("writes a canonical json file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "auq-message-map-"));
    dirs.push(dir);
    process.env.XDG_CONFIG_HOME = dir;

    await writeTelegramMessageMapEntries([
      {
        sessionId: "session-3",
        questionIndex: 0,
        chatId: "abc",
        messageId: 7,
        lastSyncedHash: "hash-4",
        state: "active",
      },
    ]);

    const file = join(dir, "auq", "telegram-message-map.json");
    const raw = JSON.parse(readFileSync(file, "utf8")) as {
      entries: Array<{ sessionId: string }>;
    };
    expect(raw.entries).toHaveLength(1);
    expect(raw.entries[0].sessionId).toBe("session-3");
  });

  it("serializes concurrent upserts so entries are not lost", async () => {
    const dir = mkdtempSync(join(tmpdir(), "auq-message-map-"));
    dirs.push(dir);
    process.env.XDG_CONFIG_HOME = dir;

    let releaseFirstWrite: (() => void) | undefined;
    let firstWritePending = true;
    const originalWriteFile = fs.writeFile;
    const writeSpy = vi.spyOn(fs, "writeFile").mockImplementation(
      async (...args: Parameters<typeof fs.writeFile>) => {
        if (firstWritePending) {
          firstWritePending = false;
          await new Promise<void>((resolve) => {
            releaseFirstWrite = resolve;
          });
        }
        return originalWriteFile(...args);
      },
    );

    try {
      const first = upsertTelegramMessageMapEntry({
        sessionId: "session-4",
        questionIndex: 0,
        chatId: "1",
        messageId: 1,
        lastSyncedHash: "hash-a",
        state: "active",
      });
      const second = upsertTelegramMessageMapEntry({
        sessionId: "session-4",
        questionIndex: 1,
        chatId: "1",
        messageId: 2,
        lastSyncedHash: "hash-b",
        state: "completed",
      });

      while (!releaseFirstWrite) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      releaseFirstWrite?.();

      await Promise.all([first, second]);

      expect(await readTelegramMessageMapEntries()).toEqual([
        expect.objectContaining({
          sessionId: "session-4",
          questionIndex: 0,
        }),
        expect.objectContaining({
          sessionId: "session-4",
          questionIndex: 1,
        }),
      ]);
    } finally {
      writeSpy.mockRestore();
    }
  });
});
