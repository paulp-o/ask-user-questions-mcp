import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock("child_process", () => ({ spawn: spawnMock }));

const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")!;
const originalPath = process.env.PATH;
const originalWindowsPath = process.env.Path;
const temporaryDirectories = new Set<string>();
const questions = [
  {
    options: [{ label: "Yes" }, { label: "No" }],
    prompt: "Continue?",
    title: "Confirm",
  },
];

function mockAuqProcess() {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();
  const child = Object.assign(new EventEmitter(), { stderr, stdin, stdout });
  let input = "";
  stdin.on("data", (chunk) => {
    input += chunk;
  });
  stdin.on("finish", () => queueMicrotask(() => child.emit("close", 0)));
  spawnMock.mockReturnValue(child as unknown as ChildProcessWithoutNullStreams);
  return { input: () => input };
}

async function executePlugin() {
  const { AskUserQuestionsPlugin } = await import("../src/index.js");
  const hooks = await AskUserQuestionsPlugin({} as never);
  const execute = hooks.tool?.ask_user_questions?.execute;
  expect(execute).toBeDefined();
  return execute!(
    { questions } as never,
    {
      directory: "/work",
      metadata: vi.fn(),
      worktree: "/work",
    } as never,
  );
}

afterEach(async () => {
  Object.defineProperty(process, "platform", originalPlatform);
  if (originalPath === undefined) delete process.env.PATH;
  else process.env.PATH = originalPath;
  if (originalWindowsPath === undefined) delete process.env.Path;
  else process.env.Path = originalWindowsPath;
  spawnMock.mockReset();
  await Promise.all(
    [...temporaryDirectories].map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
  temporaryDirectories.clear();
});

describe("OpenCode auq spawn", () => {
  it.each([
    { platform: "win32", shell: true },
    { platform: "linux", shell: false },
  ])(
    "uses shell=$shell on $platform and forwards the JSON payload",
    async ({ platform, shell }) => {
      Object.defineProperty(process, "platform", { value: platform });
      let expectedCommand = "auq";
      if (platform === "win32") {
        const root = await mkdtemp(join(tmpdir(), "auq-plugin-path-"));
        temporaryDirectories.add(root);
        const globalDirectory = join(root, "global");
        await mkdir(globalDirectory);
        const shim = join(globalDirectory, "auq.cmd");
        await writeFile(shim, "@echo off\r\n");
        // Relative PATH entries, including the current directory, are ignored.
        process.env.PATH = `.;${globalDirectory}`;
        expectedCommand = `"${shim}"`;
      }
      const child = mockAuqProcess();

      await executePlugin();
      expect(spawnMock).toHaveBeenCalledWith(expectedCommand, ["ask"], {
        shell,
        stdio: ["pipe", "pipe", "pipe"],
      });
      expect(JSON.parse(child.input())).toEqual({
        questions,
        workingDirectory: "/work",
      });
    },
  );

  it("does not fall back to a current-directory executable on Windows", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    process.env.PATH = ".";

    const result = await executePlugin();
    expect(result).toContain(
      'Could not find "auq" in an absolute PATH directory',
    );
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
