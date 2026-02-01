import { spawn } from "child_process";

import { type Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";

// Schemas are auto-generated from src/shared/schemas.ts
// Run "npm run sync-plugin-schemas" to regenerate
import { AskUserQuestionsArgs, TOOL_DESCRIPTION } from "./generated-schemas.js";

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
      async execute(args) {
        try {
          return await runAuqAsk({ questions: args.questions });
        } catch (error) {
          return `Error in session: ${String(error)}`;
        }
      },
    }),
  },
});

export default AskUserQuestionsPlugin;
