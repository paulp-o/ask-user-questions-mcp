import { spawn } from "child_process";

import { type Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";

const z = tool.schema;

const OptionSchema = z.object({
  label: z
    .string()
    .describe(
      "The display text for this option that the user will see and select. " +
        "Should be concise (1-5 words) and clearly describe the choice.",
    ),
  description: z
    .string()
    .optional()
    .describe(
      "Explanation of what this option means or what will happen if chosen. " +
        "Useful for providing context about trade-offs or implications.",
    ),
});

const QuestionSchema = z.object({
  prompt: z
    .string()
    .describe(
      "The complete question to ask the user. Should be clear, specific, and end with a question mark. " +
        "Example: 'Which programming language do you want to use?' " +
        "If multiSelect is true, phrase it accordingly, e.g. 'Which features do you want to enable?'",
    ),
  title: z
    .string()
    .min(
      1,
      "Question title is required. Provide a short summary like 'Language' or 'Framework'.",
    )
    .describe(
      "Very short label displayed as a chip/tag (max 12 chars). " +
        "Examples: 'Auth method', 'Library', 'Approach'. " +
        "This title appears in the interface to help users quickly identify questions.",
    ),
  options: z
    .array(OptionSchema)
    .min(2)
    .max(4)
    .describe(
      "The available choices for this question. Must have 2-4 options. " +
        "Each option should be a distinct, mutually exclusive choice (unless multiSelect is enabled). " +
        "There should be no 'Other' option, that will be provided automatically.",
    ),
  multiSelect: z
    .boolean()
    .describe(
      "Set to true to allow the user to select multiple options instead of just one. " +
        "Use when choices are not mutually exclusive. Default: false (single-select)",
    ),
});

const QuestionsSchema = z.array(QuestionSchema).min(1).max(4);

const AskUserQuestionsParametersSchema = z.object({
  questions: QuestionsSchema.describe(
    "Questions to ask the user (1-4 questions). " +
      "Each question must include: prompt (full question text), title (short label, max 12 chars), " +
      "options (2-4 choices with labels and descriptions), and multiSelect (boolean). " +
      "Mark one choice as recommended if possible.",
  ),
});

const TOOL_DESCRIPTION =
  "Ask users structured questions during execution to gather preferences, clarify requirements, or make implementation decisions.\n\n" +
  "FEATURES:\n" +
  "- Non-blocking: doesn't halt AI workflow\n" +
  "- 1-4 questions with 2-4 options each\n" +
  "- Single/multi-select modes\n" +
  "- Custom text input always available\n\n" +
  "Returns formatted responses for continued reasoning.";

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
      args: AskUserQuestionsParametersSchema.shape,
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
