/**
 * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 * 
 * This file is generated from src/shared/schemas.ts by scripts/sync-plugin-schemas.mjs
 * Run "npm run sync-plugin-schemas" to regenerate.
 * 
 * Generated at: 2026-02-02T16:53:36.824Z
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
  "Use this tool when you need to ask the user questions during execution. This allows you to:\n\n" +
  "Gather user preferences or requirements\n" +
  "Clarify ambiguous instructions\n" +
  "Get decisions on implementation choices as you work\n" +
  "Offer choices to the user about what direction to take.\n" +
  "Usage notes:\n\n" +
  "Users will always be able to select \"Other\" to provide custom text input\n" +
  "Use multiSelect: true to allow multiple answers to be selected for a question\n" +
  "Recommend an option unless absolutely necessary, make it the first option in the list and add \"(Recommended)\" at the end of the label\n" +
  "Do NOT use this tool to ask \"Is my plan ready?\" or \"Should I proceed?\"";

// Only export what the plugin needs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AskUserQuestionsArgs: any = AskUserQuestionsParametersSchema.shape;
export { TOOL_DESCRIPTION };
