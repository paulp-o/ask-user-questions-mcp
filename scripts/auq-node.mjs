#!/usr/bin/env node

// Windows installation selects this launcher before npm creates CMD and
// PowerShell shims. POSIX keeps the Bun-first shell launcher in bin/auq.
import { spawn } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { constants as osConstants } from "node:os";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const launcherPath = realpathSync(fileURLToPath(import.meta.url));
const entry = join(dirname(launcherPath), "../dist/bin/auq.js");
const args = process.argv.slice(2);

/**
 * Resolve Windows executables only from absolute PATH entries. CreateProcess
 * otherwise prefers the current directory, which can select an unrelated
 * bun.exe before the user's global installation.
 *
 * @param {string} name
 * @param {string[]} extensions
 */
function findRuntimeOnPath(name, extensions) {
  const pathValue = process.env.PATH ?? process.env.Path ?? "";
  const directories = pathValue.split(
    process.platform === "win32" ? ";" : delimiter,
  );

  for (const rawDirectory of directories) {
    const directory = rawDirectory.trim().replace(/^"(.*)"$/, "$1");
    if (!directory || !isAbsolute(directory)) continue;

    for (const extension of extensions) {
      const candidate = join(directory, `${name}${extension}`);
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        // Try the next executable or PATH entry.
      }
    }
  }
  return undefined;
}

// Only native executables can be spawned without a shell. If npm exposes only
// a bun.cmd shim, use the Node fallback rather than failing with ENOENT.
const bunRuntime =
  process.platform === "win32" ? findRuntimeOnPath("bun", [".exe"]) : "bun";

/** @type {import("node:child_process").ChildProcess | undefined} */
let child;

/**
 * Prefer Bun for OpenTUI, falling back to the current Node executable when Bun
 * is not installed. Argument arrays avoid shell quoting differences on Windows.
 *
 * @param {string} runtime
 * @param {boolean} fallbackToNode
 */
function launch(runtime, fallbackToNode) {
  const spawned = spawn(runtime, [entry, ...args], {
    stdio: "inherit",
  });
  child = spawned;
  let failedToStart = false;

  spawned.once("error", (error) => {
    failedToStart = true;
    if (fallbackToNode && error.code === "ENOENT") {
      launch(process.execPath, false);
      return;
    }

    console.error(`Failed to start ${runtime}: ${error.message}`);
    process.exitCode = 1;
  });

  spawned.once("close", (code, signal) => {
    if (failedToStart) return;

    if (signal) {
      process.exitCode = 128 + (osConstants.signals[signal] ?? 0);
      return;
    }
    process.exitCode = code ?? 1;
  });
}

// The shell wrapper used exec, so forward termination signals to the child
// instead of leaving the actual server or TUI running after this launcher exits.
// On Windows, console Ctrl+C already reaches the child; forwarding SIGINT again
// would force termination instead of allowing the server's graceful handler.
const forwardedSignals =
  process.platform === "win32" ? ["SIGTERM"] : ["SIGINT", "SIGTERM", "SIGHUP"];
for (const signal of forwardedSignals) {
  process.on(signal, () => {
    child?.kill(signal);
  });
}

launch(bunRuntime ?? process.execPath, Boolean(bunRuntime));
