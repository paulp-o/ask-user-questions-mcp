import { spawn } from "child_process";

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

const runAuqAsk = async (payload: unknown): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn("auq", ["ask"], {
      stdio: ["pipe", "pipe", "pipe"],
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
        // Set metadata title to show question summary in OpenCode UI
        const questions = args.questions as Question[];
        const summary = generateQuestionSummary(questions);
        context.metadata({ title: summary });

        try {
          return await runAuqAsk({ questions });
        } catch (error) {
          return `Error in session: ${String(error)}`;
        }
      },
    }),
  },
});

export default AskUserQuestionsPlugin;
