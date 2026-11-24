import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const cliPath = fileURLToPath(new URL("../../bin/auq.tsx", import.meta.url));
const children = new Set<ChildProcessWithoutNullStreams>();
const sessionDirectories = new Set<string>();
const posixIt = process.platform === "win32" ? it.skip : it;

type JsonRpcMessage = {
  id?: number;
  result?: {
    serverInfo?: { name?: string };
    tools?: Array<{ name?: string }>;
  };
};

async function withTimeout<T>(
  promise: Promise<T>,
  description: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Timed out waiting for ${description}`)),
          4000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function startServer(capabilities: Record<string, unknown> = {}) {
  const sessionDirectory = await mkdtemp(
    join(tmpdir(), "auq-server-lifecycle-"),
  );
  sessionDirectories.add(sessionDirectory);

  const child = spawn("bun", [cliPath, "server"], {
    env: {
      ...process.env,
      AUQ_SESSION_DIR: sessionDirectory,
      NO_UPDATE_NOTIFIER: "1",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  children.add(child);
  child.once("exit", () => children.delete(child));

  let bufferedStdout = "";
  let rawStdout = "";
  let stderr = "";
  const messages: JsonRpcMessage[] = [];
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    rawStdout += chunk;
    bufferedStdout += chunk;
    const lines = bufferedStdout.split("\n");
    bufferedStdout = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) messages.push(JSON.parse(line) as JsonRpcMessage);
    }
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  function send(message: Record<string, unknown>) {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
  }

  async function request(id: number, method: string, params?: unknown) {
    let onData: (() => void) | undefined;
    const responsePromise = new Promise<JsonRpcMessage | undefined>(
      (resolve) => {
        const existing = messages.find((message) => message.id === id);
        if (existing) {
          resolve(existing);
          return;
        }
        onData = () => {
          const response = messages.find((message) => message.id === id);
          if (response) {
            if (onData) child.stdout.off("data", onData);
            resolve(response);
          }
        };
        child.stdout.on("data", onData);
      },
    );

    send({ id, method, params });
    try {
      return await withTimeout(
        responsePromise,
        `${method} response. stderr: ${stderr}`,
      );
    } finally {
      if (onData) child.stdout.off("data", onData);
    }
  }

  await request(1, "initialize", {
    capabilities,
    clientInfo: { name: "server-lifecycle-test", version: "1.0.0" },
    protocolVersion: "2025-03-26",
  });

  return {
    child,
    request,
    send,
    sessionDirectory,
    stderr: () => stderr,
    stdout: () => rawStdout,
  };
}

async function exitResult(child: ChildProcessWithoutNullStreams) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return { code: child.exitCode, signal: child.signalCode };
  }
  const [code, signal] = await withTimeout(once(child, "exit"), "server exit");
  return { code, signal } as {
    code: number | null;
    signal: NodeJS.Signals | null;
  };
}

function sendBlockingQuestion(
  send: (message: Record<string, unknown>) => void,
) {
  send({
    id: 3,
    method: "tools/call",
    params: {
      arguments: {
        questions: [
          {
            multiSelect: false,
            options: [{ label: "Yes" }, { label: "No" }],
            prompt: "Continue?",
            title: "Confirm",
          },
        ],
      },
      name: "ask_user_questions",
    },
  });
}

async function waitForSession(sessionDirectory: string) {
  return vi.waitFor(
    async () => {
      const entries = await readdir(sessionDirectory, { withFileTypes: true });
      const session = entries.find((entry) => entry.isDirectory());
      expect(session).toBeDefined();
      return session!.name;
    },
    { interval: 20, timeout: 4000 },
  );
}

async function expectAbandoned(sessionDirectory: string, sessionId: string) {
  const status = JSON.parse(
    await readFile(join(sessionDirectory, sessionId, "status.json"), "utf8"),
  ) as { status?: string };
  expect(status.status).toBe("abandoned");
}

afterEach(async () => {
  for (const child of children) child.kill("SIGKILL");
  await Promise.all([...children].map((child) => once(child, "exit")));
  children.clear();
  await Promise.all(
    [...sessionDirectories].map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
  sessionDirectories.clear();
});

describe("MCP stdio server lifecycle", () => {
  it("serves MCP requests and exits after the client closes stdin", async () => {
    const { child, request, send, stdout } = await startServer();
    send({ method: "notifications/initialized" });

    const response = await request(2, "tools/list", {});
    expect(response?.result?.tools?.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["ask_user_questions", "get_answered_questions"]),
    );

    child.stdin.end();
    await expect(exitResult(child)).resolves.toEqual({ code: 0, signal: null });
    for (const line of stdout().trim().split("\n")) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  }, 10_000);

  posixIt.each([
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const)(
    "exits cleanly on %s",
    async (signal, exitCode) => {
      const { child } = await startServer();
      child.kill(signal);
      await expect(exitResult(child)).resolves.toEqual({
        code: exitCode,
        signal: null,
      });
    },
    10_000,
  );

  it("aborts an active question and exits on stdin EOF", async () => {
    const { child, send, sessionDirectory } = await startServer();
    sendBlockingQuestion(send);
    const sessionId = await waitForSession(sessionDirectory);

    child.stdin.end();
    await expect(exitResult(child)).resolves.toEqual({ code: 0, signal: null });
    await expectAbandoned(sessionDirectory, sessionId);
  }, 10_000);

  posixIt(
    "aborts an active question and exits on SIGTERM",
    async () => {
      const { child, send, sessionDirectory } = await startServer();
      sendBlockingQuestion(send);
      const sessionId = await waitForSession(sessionDirectory);

      child.kill("SIGTERM");
      await expect(exitResult(child)).resolves.toEqual({
        code: 143,
        signal: null,
      });
      await expectAbandoned(sessionDirectory, sessionId);
    },
    10_000,
  );

  it("exits cleanly when the client closes both pipes during a question", async () => {
    const { child, send, sessionDirectory } = await startServer();
    sendBlockingQuestion(send);
    const sessionId = await waitForSession(sessionDirectory);

    child.stdout.destroy();
    child.stdin.end();
    await expect(exitResult(child)).resolves.toEqual({ code: 0, signal: null });
    await expectAbandoned(sessionDirectory, sessionId);
  }, 10_000);

  it("does not leave a first request running when EOF follows it immediately", async () => {
    const { child, send, sessionDirectory } = await startServer();
    sendBlockingQuestion(send);
    child.stdin.end();

    await expect(exitResult(child)).resolves.toEqual({ code: 0, signal: null });
    const entries = await readdir(sessionDirectory, { withFileTypes: true });
    for (const entry of entries.filter((entry) => entry.isDirectory())) {
      await expectAbandoned(sessionDirectory, entry.name);
    }
  }, 10_000);

  it("exits without waiting for a roots response during initialization", async () => {
    const { child } = await startServer({ roots: { listChanged: true } });
    child.stdin.end();
    await expect(exitResult(child)).resolves.toEqual({ code: 0, signal: null });
  }, 10_000);
});
