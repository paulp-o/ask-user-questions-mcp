import { promises as fs } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

export type TelegramMessageState = "active" | "completed" | "stale";

export interface TelegramMessageMapEntry {
  chatId: string;
  lastSyncedHash: string;
  messageId: number;
  questionIndex: number;
  sessionId: string;
  state: TelegramMessageState;
}

interface TelegramMessageMapFile {
  entries: TelegramMessageMapEntry[];
}

const TELEGRAM_MESSAGE_MAP_FILE = "telegram-message-map.json";
let writeQueue: Promise<void> = Promise.resolve();

function getConfigBaseDir(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
}

export function getTelegramMessageMapPath(): string {
  return join(getConfigBaseDir(), "auq", TELEGRAM_MESSAGE_MAP_FILE);
}

function isTelegramMessageState(value: unknown): value is TelegramMessageState {
  return value === "active" || value === "completed" || value === "stale";
}

function normalizeEntry(
  entry: Partial<TelegramMessageMapEntry> | null | undefined,
): TelegramMessageMapEntry | null {
  if (!entry) return null;
  if (
    typeof entry.sessionId !== "string" ||
    typeof entry.questionIndex !== "number" ||
    typeof entry.chatId !== "string" ||
    typeof entry.messageId !== "number" ||
    typeof entry.lastSyncedHash !== "string" ||
    !isTelegramMessageState(entry.state)
  ) {
    return null;
  }

  return {
    sessionId: entry.sessionId,
    questionIndex: entry.questionIndex,
    chatId: entry.chatId,
    messageId: entry.messageId,
    lastSyncedHash: entry.lastSyncedHash,
    state: entry.state,
  };
}

function dedupeEntries(entries: TelegramMessageMapEntry[]): TelegramMessageMapEntry[] {
  const map = new Map<string, TelegramMessageMapEntry>();
  for (const entry of entries) {
    map.set(`${entry.sessionId}:${entry.questionIndex}`, entry);
  }
  return [...map.values()].sort((a, b) => {
    const sessionCompare = a.sessionId.localeCompare(b.sessionId);
    if (sessionCompare !== 0) return sessionCompare;
    return a.questionIndex - b.questionIndex;
  });
}

async function readTelegramMessageMapFile(): Promise<TelegramMessageMapFile> {
  const path = getTelegramMessageMapPath();
  try {
    const raw = await fs.readFile(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<TelegramMessageMapFile>;
    if (!Array.isArray(parsed.entries)) {
      return { entries: [] };
    }
    return {
      entries: parsed.entries.map((entry) => normalizeEntry(entry)).filter(
        (entry): entry is TelegramMessageMapEntry => entry !== null,
      ),
    };
  } catch {
    return { entries: [] };
  }
}

async function writeTelegramMessageMapFile(data: TelegramMessageMapFile): Promise<void> {
  const path = getTelegramMessageMapPath();
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify({ entries: dedupeEntries(data.entries) }, null, 2) + "\n", "utf8");
}

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const current = writeQueue.then(operation, operation);
  writeQueue = current.then(
    () => undefined,
    () => undefined,
  );
  return current;
}

async function waitForWrites(): Promise<void> {
  await writeQueue;
}

export async function readTelegramMessageMapEntries(): Promise<TelegramMessageMapEntry[]> {
  await waitForWrites();
  const data = await readTelegramMessageMapFile();
  return data.entries;
}

export async function writeTelegramMessageMapEntries(
  entries: TelegramMessageMapEntry[],
): Promise<void> {
  await enqueueWrite(async () => {
    await writeTelegramMessageMapFile({ entries });
  });
}

export async function upsertTelegramMessageMapEntry(
  entry: TelegramMessageMapEntry,
): Promise<void> {
  await enqueueWrite(async () => {
    const data = await readTelegramMessageMapFile();
    const key = `${entry.sessionId}:${entry.questionIndex}`;
    const nextEntries = data.entries.filter(
      (existing) => `${existing.sessionId}:${existing.questionIndex}` !== key,
    );
    nextEntries.push(entry);
    await writeTelegramMessageMapFile({ entries: nextEntries });
  });
}

export async function getTelegramMessageMapEntry(
  sessionId: string,
  questionIndex: number,
): Promise<TelegramMessageMapEntry | undefined> {
  const entries = await readTelegramMessageMapEntries();
  return entries.find(
    (entry) => entry.sessionId === sessionId && entry.questionIndex === questionIndex,
  );
}

export async function setTelegramMessageMapState(
  sessionId: string,
  questionIndex: number,
  state: TelegramMessageState,
): Promise<TelegramMessageMapEntry | null> {
  return enqueueWrite(async () => {
    const data = await readTelegramMessageMapFile();
    const index = data.entries.findIndex(
      (entry) => entry.sessionId === sessionId && entry.questionIndex === questionIndex,
    );
    if (index === -1) {
      return null;
    }

    const updated: TelegramMessageMapEntry = {
      ...data.entries[index],
      state,
    };
    data.entries[index] = updated;
    await writeTelegramMessageMapFile({ entries: data.entries });
    return updated;
  });
}
