import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const launcherPath = fileURLToPath(
  new URL("../../scripts/auq-node.mjs", import.meta.url),
);
const postinstallPath = fileURLToPath(
  new URL("../../scripts/postinstall.cjs", import.meta.url),
);
const posixLauncherPath = fileURLToPath(
  new URL("../../bin/auq", import.meta.url),
);
const temporaryDirectories = new Set<string>();
const children = new Set<ChildProcessWithoutNullStreams>();
const posixIt = process.platform === "win32" ? it.skip : it;
const inputPayload = { note: "two words", prompt: "Continue?" };

function track(child: ChildProcessWithoutNullStreams) {
  children.add(child);
  child.once("close", () => children.delete(child));
  return child;
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "auq-launcher-test-"));
  temporaryDirectories.add(root);
  const binDirectory = join(root, "bin");
  const entryDirectory = join(root, "dist", "bin");
  await mkdir(binDirectory, { recursive: true });
  await mkdir(entryDirectory, { recursive: true });

  const launcher = join(binDirectory, "auq");
  await copyFile(launcherPath, launcher);
  await writeFile(
    join(entryDirectory, "auq.js"),
    `let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  console.log(JSON.stringify({
    args: process.argv.slice(2),
    runtime: process.env.AUQ_TEST_RUNTIME ?? "node",
    input: JSON.parse(input),
  }));
  process.exitCode = Number(process.env.AUQ_TEST_EXIT ?? 0);
});
`,
  );
  return { launcher, root };
}

async function runLauncher(
  launcher: string,
  environment: Record<string, string> = {},
  nodeOptions: string[] = [],
) {
  const child = track(
    spawn(process.execPath, [...nodeOptions, launcher, "ask", "two words"], {
      env: { ...process.env, PATH: "", ...environment },
      stdio: ["pipe", "pipe", "pipe"],
    }),
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.stdin.end(JSON.stringify(inputPayload));
  const [code, signal] = await once(child, "close");
  return { code, signal, stderr, stdout };
}

afterEach(async () => {
  const running = [...children].filter(
    (child) => child.exitCode === null && child.signalCode === null,
  );
  for (const child of running) child.kill("SIGKILL");
  await Promise.all(running.map((child) => once(child, "close")));
  children.clear();
  await Promise.all(
    [...temporaryDirectories].map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
  temporaryDirectories.clear();
});

describe("cross-platform auq launcher", () => {
  it("uses a Node shebang that npm can translate to Windows shims", async () => {
    const source = await readFile(launcherPath, "utf8");
    expect(source.startsWith("#!/usr/bin/env node")).toBe(true);
  });

  it("keeps a hook-free Bun-first POSIX launcher by default", async () => {
    const source = await readFile(posixLauncherPath, "utf8");
    expect(source.startsWith("#!/bin/sh")).toBe(true);
    expect(source).toContain("exec bun");
  });

  it("falls back to Node and preserves arguments and stdin", async () => {
    const { launcher } = await createFixture();
    const result = await runLauncher(launcher);

    expect(result).toMatchObject({ code: 0, signal: null, stderr: "" });
    expect(JSON.parse(result.stdout)).toEqual({
      args: ["ask", "two words"],
      input: inputPayload,
      runtime: "node",
    });
  });

  it("propagates a non-zero child exit code", async () => {
    const { launcher } = await createFixture();
    const result = await runLauncher(launcher, { AUQ_TEST_EXIT: "7" });
    expect(result.code).toBe(7);
  });

  posixIt("resolves symlinks even with --preserve-symlinks-main", async () => {
    const { launcher, root } = await createFixture();
    const linkedLauncher = join(root, "linked-auq");
    await symlink(launcher, linkedLauncher);

    const result = await runLauncher(linkedLauncher, {}, [
      "--preserve-symlinks-main",
    ]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).input).toEqual(inputPayload);
  });

  posixIt("prefers Bun when it is available on PATH", async () => {
    const { root, launcher } = await createFixture();
    const runtimeDirectory = join(root, "runtime");
    await mkdir(runtimeDirectory);
    const fakeBun = join(runtimeDirectory, "bun");
    await writeFile(
      fakeBun,
      '#!/bin/sh\nAUQ_TEST_RUNTIME=bun\nexport AUQ_TEST_RUNTIME\nexec "$AUQ_TEST_NODE" "$@"\n',
    );
    await chmod(fakeBun, 0o755);

    const result = await runLauncher(launcher, {
      AUQ_TEST_NODE: process.execPath,
      PATH: runtimeDirectory,
    });
    expect(result).toMatchObject({ code: 0, signal: null, stderr: "" });
    expect(JSON.parse(result.stdout)).toMatchObject({
      input: inputPayload,
      runtime: "bun",
    });
  });

  posixIt("selects the Node launcher for Windows installations", async () => {
    const { launcher, root } = await createFixture();
    await copyFile(posixLauncherPath, launcher);
    const scriptsDirectory = join(root, "scripts");
    await mkdir(scriptsDirectory);
    const postinstall = join(scriptsDirectory, "postinstall.cjs");
    await copyFile(postinstallPath, postinstall);
    await copyFile(launcherPath, join(scriptsDirectory, "auq-node.mjs"));
    const mockWindows = join(root, "mock-windows.cjs");
    await writeFile(
      mockWindows,
      'Object.defineProperty(process, "platform", { value: "win32" });\n',
    );

    const child = track(
      spawn(process.execPath, ["--require", mockWindows, postinstall], {
        cwd: root,
        env: {
          ...process.env,
          INIT_CWD: join(root, "consumer"),
          npm_config_global: "true",
          SHELL: "",
        },
        stdio: ["pipe", "pipe", "pipe"],
      }),
    );
    child.stdin.end();
    const [code] = await once(child, "close");

    expect(code).toBe(0);
    expect(
      (await readFile(launcher, "utf8")).startsWith("#!/usr/bin/env node"),
    ).toBe(true);
  });
});
