/**
 * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 * 
 * This file is generated from src/shared/schemas.ts by scripts/sync-plugin-schemas.mjs
 * Run "npm run sync-plugin-schemas" to regenerate.
 * 
 * Generated at: 2026-02-03T10:21:44.138Z
 */

import { tool } from "@opencode-ai/plugin/tool";

const z = tool.schema;

/**
 * Default limits - can be overridden by config
 * These are the hard maximums enforced by the schema (config can only reduce, not increase)
 */
const SCHEMA_LIMITS = {
  MAX_OPTIONS: 10,
  MAX_QUESTIONS: 10,
  MIN_OPTIONS: 2,
  MIN_QUESTIONS: 1,
} as const;

/**
 * Default recommended limits (used when no config is provided)
 */
const DEFAULT_LIMITS = {
  maxOptions: 5,
  maxQuestions: 5,
  recommendedOptions: 4,
  recommendedQuestions: 4,
} as const;

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

/**
 * Create a QuestionSchema with configurable option limits
 * @param maxOptions - Maximum number of options allowed (default: 4, max: 10)
 */
export function createQuestionSchema(
  maxOptions: number = DEFAULT_LIMITS.maxOptions,
) {
  // Clamp to valid range
  const effectiveMax = Math.min(
    Math.max(maxOptions, SCHEMA_LIMITS.MIN_OPTIONS),
    SCHEMA_LIMITS.MAX_OPTIONS,
  );

  return z.object({
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
      .min(SCHEMA_LIMITS.MIN_OPTIONS)
      .max(effectiveMax)
      .describe(
        `The available choices for this question. Must have ${SCHEMA_LIMITS.MIN_OPTIONS}-${effectiveMax} options. ` +
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
}

/**
 * Create a QuestionsSchema with configurable limits
 * @param maxQuestions - Maximum number of questions allowed (default: 4, max: 10)
 * @param maxOptions - Maximum number of options per question (default: 4, max: 10)
 */
export function createQuestionsSchema(
  maxQuestions: number = DEFAULT_LIMITS.maxQuestions,
  maxOptions: number = DEFAULT_LIMITS.maxOptions,
) {
  const effectiveMaxQuestions = Math.min(
    Math.max(maxQuestions, SCHEMA_LIMITS.MIN_QUESTIONS),
    SCHEMA_LIMITS.MAX_QUESTIONS,
  );
  const questionSchema = createQuestionSchema(maxOptions);

  return z
    .array(questionSchema)
    .min(SCHEMA_LIMITS.MIN_QUESTIONS)
    .max(effectiveMaxQuestions);
}

/**
 * Create the full parameters schema with configurable limits
 * @param maxQuestions - Maximum number of questions (default: 4, max: 10)
 * @param maxOptions - Maximum number of options per question (default: 4, max: 10)
 */
export function createAskUserQuestionsParametersSchema(
  maxQuestions: number = DEFAULT_LIMITS.maxQuestions,
  maxOptions: number = DEFAULT_LIMITS.maxOptions,
) {
  const questionsSchema = createQuestionsSchema(maxQuestions, maxOptions);

  return z.object({
    questions: questionsSchema.describe(
      `Questions to ask the user (1-${maxQuestions} questions). ` +
        `Each question must include: prompt (full question text), title (short label, max 12 chars), ` +
        `options (2-${maxOptions} choices with labels and descriptions), and multiSelect (boolean).`,
    ),
  });
}

// Default schemas for backward compatibility (using DEFAULT_LIMITS)
const QuestionSchema = createQuestionSchema();
const QuestionsSchema = createQuestionsSchema();
const AskUserQuestionsParametersSchema =
  createAskUserQuestionsParametersSchema();

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
  'Users will always be able to select "Other" to provide custom text input\n' +
  "Use multiSelect: true to allow multiple answers to be selected for a question\n" +
  'Recommend an option unless absolutely necessary, make it the first option in the list and add "(Recommended)" at the end of the label\n' +
  'For multiSelect questions, you MAY mark multiple options as "(Recommended)" if several choices are advisable\n' +
  'Do NOT use this tool to ask "Is my plan ready?" or "Should I proceed?"';

// Only export what the plugin needs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AskUserQuestionsArgs: any = AskUserQuestionsParametersSchema.shape;
export { TOOL_DESCRIPTION };
