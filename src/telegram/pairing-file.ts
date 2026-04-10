import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

export interface PendingPairing {
  attemptsLeft: number;
  expiresAt: string;
  id: string;
  pin: string;
  targetConfigFile: string;
}

interface PairingFileShape {
  entries: PendingPairing[];
}

function getConfigBaseDir(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
}

export function getPairingFilePath(): string {
  return join(getConfigBaseDir(), "auq", "telegram-pairings.json");
}

function readPairings(): PairingFileShape {
  const path = getPairingFilePath();
  if (!existsSync(path)) {
    return { entries: [] };
  }

  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as PairingFileShape;
    if (!Array.isArray(parsed.entries)) {
      return { entries: [] };
    }
    return parsed;
  } catch {
    return { entries: [] };
  }
}

function writePairings(data: PairingFileShape): void {
  const path = getPairingFilePath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

export function putPendingPairing(pairing: PendingPairing): void {
  const data = readPairings();
  data.entries = data.entries.filter((entry) => entry.id !== pairing.id);
  data.entries.push(pairing);
  writePairings(data);
}

export function consumePairingByPin(pin: string, chatId: string): {
  message: string;
  ok: boolean;
} {
  const data = readPairings();
  const now = Date.now();
  data.entries = data.entries.filter(
    (entry) => new Date(entry.expiresAt).getTime() > now,
  );
  if (data.entries.length === 0) {
    writePairings(data);
    return { ok: false, message: "PIN 已過期" };
  }

  const entry = data.entries[0];
  if (entry.pin !== pin) {
    entry.attemptsLeft -= 1;
    if (entry.attemptsLeft <= 0) {
      data.entries.shift();
      writePairings(data);
      return { ok: false, message: "PIN 嘗試次數已用盡" };
    }
    data.entries[0] = entry;
    writePairings(data);
    return { ok: false, message: `PIN 錯誤，剩餘 ${entry.attemptsLeft} 次` };
  }

  const targetPath = entry.targetConfigFile;
  const currentConfig = existsSync(targetPath)
    ? JSON.parse(readFileSync(targetPath, "utf8")) as Record<string, unknown>
    : {};

  const telegram =
    typeof currentConfig.telegram === "object" && currentConfig.telegram
      ? { ...(currentConfig.telegram as Record<string, unknown>) }
      : {};

  if (typeof telegram.allowedChatId === "string" && telegram.allowedChatId && telegram.allowedChatId !== chatId) {
    return { ok: false, message: "已綁定其他 chat，請使用 rebind" };
  }

  telegram.allowedChatId = chatId;
  telegram.enabled = true;
  currentConfig.telegram = telegram;

  const dir = dirname(targetPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(targetPath, JSON.stringify(currentConfig, null, 2) + "\n");

  data.entries.shift();
  writePairings(data);

  return { ok: true, message: "Telegram 對接成功" };
}
