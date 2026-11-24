import { spawn } from "child_process";
import { statSync } from "fs";
import { isAbsolute, join } from "path";

import { type Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";

// Schemas are auto-generated from src/shared/schemas.ts
// Run "npm run sync-plugin-schemas" to regenerate
import { AskUserQuestionsArgs, TOOL_DESCRIPTION } from "./generated-schemas.js";

/** Question type for OpenCode plugin */
interface Question {
  title: string;
  prompt: string;
  options: Array<{ label: string; description?: string }>;
  multiSelect?: boolean;
}

// Map tool callID -> derived title (used by tool.execute.after)
const titleByCallId = new Map<string, string>();

/**
 * Generate a summary title for the question set
 * Format: "Questions: [Q0] Language, [Q1] Framework"
 */
function generateQuestionSummary(questions: Question[]): string {
  const questionLabels = questions
    .map((q, i) => `[Q${i}] ${q.title}`)
    .join(", ");
  return `Questions: ${questionLabels}`;
}

function safeSummaryFromArgs(args: unknown): string | null {
  if (!args || typeof args !== "object") return null;
  const maybeQuestions = (args as { questions?: unknown }).questions;
  if (!Array.isArray(maybeQuestions)) return null;
  const questions = maybeQuestions as Array<Partial<Question>>;
  const labels = questions
    .map((q, i) => {
      const title = (q.title || q.prompt || "").toString().trim();
      return `[Q${i}] ${title || "(untitled)"}`;
    })
    .join(", ");
  return `Questions: ${labels}`;
}

function resolveWindowsAuq(): string {
  const pathValue = process.env.PATH ?? process.env.Path ?? "";
  for (const rawDirectory of pathValue.split(";")) {
    const directory = rawDirectory.trim().replace(/^"(.*)"$/, "$1");
    if (!directory || !isAbsolute(directory)) continue;

    for (const extension of [".cmd", ".exe", ".bat"]) {
      const candidate = join(directory, `auq${extension}`);
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        // Try the next executable or absolute PATH entry.
      }
    }
  }
  throw new Error(
    'Could not find "auq" in an absolute PATH directory. Is the auq CLI installed globally?',
  );
}

const runAuqAsk = async (payload: unknown): Promise<string> =>
  new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    // cmd.exe prefers the current directory. Resolve only absolute PATH
    // entries and quote the resulting path before invoking the npm shim.
    const command = isWindows ? `"${resolveWindowsAuq()}"` : "auq";
    const child = spawn(command, ["ask"], {
      stdio: ["pipe", "pipe", "pipe"],
      // npm exposes `auq` as a .cmd shim on Windows. Node cannot spawn that
      // shim directly, while POSIX should retain the direct, no-shell path.
      shell: isWindows,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `Failed to run "auq ask": ${error.message}. Is the auq CLI installed globally?`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      const detail = stderr.trim() || stdout.trim();
      reject(new Error(detail || `auq ask exited with code ${code}`));
    });

    child.stdin.on("error", (error) => {
      reject(new Error(`Failed to write to "auq ask": ${error.message}`));
    });

    try {
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    } catch (error) {
      reject(error);
    }
  });

export const AskUserQuestionsPlugin: Plugin = async () => ({
  tool: {
    ask_user_questions: tool({
      description: TOOL_DESCRIPTION,
      args: AskUserQuestionsArgs,
      async execute(args, context) {
        // Best-effort: set call metadata (some OpenCode UIs won't render this title).
        const questions = args.questions as Question[];
        const summary = generateQuestionSummary(questions);
        context.metadata({
          title: summary,
          metadata: { auqQuestionSummary: summary },
        });

        try {
          // Get working directory from OpenCode context
          const workingDirectory = context.directory || context.worktree;

          // Build payload explicitly
          const payload: { questions: Question[]; workingDirectory?: string } =
            {
              questions,
            };
          if (workingDirectory) {
            payload.workingDirectory = workingDirectory;
          }

          return await runAuqAsk(payload);
        } catch (error) {
          return `Error in session: ${String(error)}`;
        }
      },
    }),
  },
  // Force the tool call title in OpenCode UI.
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "ask_user_questions") return;
    const summary = safeSummaryFromArgs(output.args);
    if (summary) titleByCallId.set(input.callID, summary);
  },
  "tool.execute.after": async (input, output) => {
    if (input.tool !== "ask_user_questions") return;
    const summary = titleByCallId.get(input.callID);
    if (summary) {
      output.title = summary;
    }
    titleByCallId.delete(input.callID);
  },
});

export default AskUserQuestionsPlugin;
