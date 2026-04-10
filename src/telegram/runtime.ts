import { promises as fs } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

import type { TelegramConfig } from "../config/types.js";

import { SessionManager } from "../session/SessionManager.js";
import { getSessionDirectory } from "../session/utils.js";
import { reconcileActiveTelegramMessages } from "./notifier.js";
import { startTelegramWebhookServer } from "./webhook.js";

type RuntimeServerHandle = { close: () => Promise<void> } | null;

interface RuntimeLock {
  bindHost: string;
  bindPort: number;
  pid: number;
  startedAt: string;
}

type RuntimeState =
  | { started: false }
  | {
      lockPath: string;
      lockOwner: boolean;
      server: RuntimeServerHandle;
      sessionManager: SessionManager;
      started: true;
    };

export type TelegramRuntimeStartResult =
  | { status: "disabled" | "missing-config" }
  | { status: "already-running" }
  | { message: string; ownerPid: number; status: "conflict" }
  | { status: "started" };

let runtimeState: RuntimeState = { started: false };

function getLockPath(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "auq", "telegram-runtime.lock");
}

async function readLock(path: string): Promise<RuntimeLock | null> {
  try {
    const raw = await fs.readFile(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<RuntimeLock>;
    if (
      typeof parsed.pid !== "number" ||
      typeof parsed.bindHost !== "string" ||
      typeof parsed.bindPort !== "number" ||
      typeof parsed.startedAt !== "string"
    ) {
      return null;
    }
    return parsed as RuntimeLock;
  } catch {
    return null;
  }
}

function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function writeLock(path: string, lock: RuntimeLock): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(lock, null, 2) + "\n", "utf8");
}

async function removeLock(path: string): Promise<void> {
  try {
    await fs.unlink(path);
  } catch {
    // ignore
  }
}

async function acquireRuntimeLock(
  bindHost: string,
  bindPort: number,
): Promise<
  | { lockPath: string; lockOwner: true }
  | { lockPath: string; lockOwner: false; ownerPid: number }
> {
  const lockPath = getLockPath();
  const existing = await readLock(lockPath);

  if (existing) {
    if (existing.pid === process.pid) {
      return { lockPath, lockOwner: true };
    }
    if (isPidAlive(existing.pid)) {
      return { lockPath, lockOwner: false, ownerPid: existing.pid };
    }
    await removeLock(lockPath);
  }

  await writeLock(lockPath, {
    bindHost,
    bindPort,
    pid: process.pid,
    startedAt: new Date().toISOString(),
  });

  return { lockPath, lockOwner: true };
}

export async function startTelegramClientRuntime(
  telegramConfig: TelegramConfig,
): Promise<TelegramRuntimeStartResult> {
  if (!telegramConfig.enabled) return { status: "disabled" };
  if (!telegramConfig.bindHost || !telegramConfig.bindPort) {
    return { status: "missing-config" };
  }

  if (runtimeState.started) {
    return { status: "already-running" };
  }

  const lock = await acquireRuntimeLock(
    telegramConfig.bindHost,
    telegramConfig.bindPort,
  );
  if (!lock.lockOwner) {
    return {
      status: "conflict",
      ownerPid: lock.ownerPid,
      message: `Telegram runtime is already hosted by PID ${lock.ownerPid}`,
    };
  }

  const sessionManager = new SessionManager({ baseDir: getSessionDirectory() });
  try {
    await sessionManager.initialize();
    const server = startTelegramWebhookServer(sessionManager, telegramConfig);
    if (!server) {
      await removeLock(lock.lockPath);
      return { status: "missing-config" };
    }

    void reconcileActiveTelegramMessages(sessionManager, telegramConfig).catch(
      () => {},
    );

    runtimeState = {
      started: true,
      lockOwner: true,
      lockPath: lock.lockPath,
      server,
      sessionManager,
    };
    return { status: "started" };
  } catch {
    await removeLock(lock.lockPath);
    return { status: "missing-config" };
  }
}

export async function stopTelegramClientRuntime(): Promise<void> {
  if (!runtimeState.started) return;
  const current = runtimeState;
  runtimeState = { started: false };

  try {
    await current.server?.close();
  } catch {
    // ignore
  }

  if (current.lockOwner) {
    await removeLock(current.lockPath);
  }
}

