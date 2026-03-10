import { homedir } from "os";
import { join } from "path";

/**
 * Parse CLI flags from an args array.
 * Handles --flag (boolean) and --flag value patterns.
 * Everything not starting with -- goes to positionals.
 */
export function parseFlags(args: string[]): {
  flags: Record<string, string | true>;
  positionals: string[];
} {
  const flags: Record<string, string | true> = {};
  const positionals: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++; // skip next arg — it was consumed as a value
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { flags, positionals };
}

/**
 * Standard CLI output result shape.
 */
export interface CLIResult {
  success: boolean;
  [key: string]: unknown;
}

/**
 * Standard CLI output helper.
 * - jsonMode: console.log(JSON.stringify(result, null, 2))
 * - else: human-readable formatted output
 */
export function outputResult(result: CLIResult, jsonMode: boolean): void {
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!result.success) {
    const message =
      typeof result.error === "string"
        ? result.error
        : typeof result.message === "string"
          ? result.message
          : "Unknown error";
    console.error(`Error: ${message}`);
    return;
  }

  // Human-readable: print each key=value pair (skip success)
  for (const [key, value] of Object.entries(result)) {
    if (key === "success") continue;
    if (typeof value === "object" && value !== null) {
      console.log(`${key}:`);
      for (const [subKey, subValue] of Object.entries(
        value as Record<string, unknown>,
      )) {
        console.log(`  ${subKey} = ${String(subValue)}`);
      }
    } else {
      console.log(`${key} = ${String(value)}`);
    }
  }
}

/**
 * Format age from a timestamp to a human-readable string.
 * Returns "Xm ago", "Xh ago", "Xd ago", etc.
 */
export function formatAge(createdAt: string | Date): string {
  const now = Date.now();
  const then =
    createdAt instanceof Date
      ? createdAt.getTime()
      : new Date(createdAt).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Resolve the archive directory for dismissed sessions.
 * Uses the XDG data home standard: ~/.local/share/auq/archive
 */
export function resolveArchiveDirectory(): string {
  const xdgDataHome =
    process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(xdgDataHome, "auq", "archive");
}