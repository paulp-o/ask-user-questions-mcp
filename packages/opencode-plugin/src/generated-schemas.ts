/**
 * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 * 
 * This file is generated from src/shared/schemas.ts by scripts/sync-plugin-schemas.mjs
 * Run "npm run sync-plugin-schemas" to regenerate.
 * 
 * Generated at: 2026-02-01T10:47:19.235Z
 */

import { tool } from "@opencode-ai/plugin/tool";

const z = tool.schema;

const OptionSchema = z.object({
  label: z
    .string()
    .describe(
      "The display text for this option. Should be concise (1-5 words). " +
        "To mark as recommended, append '(recommended)' to the label text.",
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
      "options (2-4 choices with labels and descriptions), and multiSelect (boolean).",
  ),
});

/**
 * Comprehensive tool description - single source of truth.
 * Used by MCP server and should be synced to opencode-plugin.
 */
const TOOL_DESCRIPTION =
  "Ask users structured questions during execution to gather preferences, clarify requirements, or make implementation decisions.\n\n" +
  "FEATURES:\n" +
  "- Non-blocking: doesn't halt AI workflow\n" +
  "- 1-4 questions with 2-4 options each\n" +
  "- Single/multi-select modes\n" +
  "- Custom text input always available\n\n" +
  "USAGE NOTES:\n" +
  "- Provide a descriptive 'title' field (max 12 chars) for each question\n" +
  "- Use multiSelect: true when choices are not mutually exclusive\n" +
  "- Option labels should be concise (1-5 words)\n" +
  "- To mark a recommended option, append '(recommended)' to its label\n" +
  "- Don't include an 'Other' option - it's provided automatically\n\n" +
  "Returns formatted responses for continued reasoning.";

// Only export what the plugin needs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AskUserQuestionsArgs: any = AskUserQuestionsParametersSchema.shape;
export { TOOL_DESCRIPTION };
