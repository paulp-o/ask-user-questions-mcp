import { z } from "zod";

import type { Question } from "../session/types.js";

import { SessionManager } from "../session/index.js";
import { getSessionDirectory } from "../session/utils.js";

export const OptionSchema = z.object({
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

export const QuestionSchema = z.object({
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

export const QuestionsSchema = z.array(QuestionSchema).min(1).max(4);

export const AskUserQuestionsParametersSchema = z.object({
  questions: QuestionsSchema.describe(
    "Questions to ask the user (1-4 questions). " +
      "Each question must include: prompt (full question text), title (short label, max 12 chars), " +
      "options (2-4 choices with labels and descriptions), and multiSelect (boolean).",
  ),
});

export type QuestionInput = z.infer<typeof QuestionSchema>;

export type AskUserQuestionsCore = {
  ask: (
    questions: QuestionInput[],
    callId?: string,
  ) => Promise<{ formattedResponse: string; sessionId: string }>;
  cleanupExpiredSessions: () => Promise<number>;
  ensureInitialized: () => Promise<void>;
};

export type AskUserQuestionsCoreOptions = {
  baseDir?: string;
  sessionManager?: SessionManager;
};

export const createAskUserQuestionsCore = (
  options: AskUserQuestionsCoreOptions = {},
): AskUserQuestionsCore => {
  const baseDir = options.baseDir ?? getSessionDirectory();
  const sessionManager =
    options.sessionManager ?? new SessionManager({ baseDir });
  let initialized = false;

  const ensureInitialized = async () => {
    if (initialized) return;
    await sessionManager.initialize();
    initialized = true;
  };

  const normalizeQuestions = (questions: QuestionInput[]): Question[] =>
    questions.map((question) => ({
      options: question.options.map((option) => ({
        description: option.description,
        label: option.label,
      })),
      prompt: question.prompt,
      title: question.title,
      multiSelect: question.multiSelect,
    }));

  const ask = async (questions: QuestionInput[], callId?: string) => {
    await ensureInitialized();
    const parsedQuestions = QuestionsSchema.parse(questions);
    return sessionManager.startSession(normalizeQuestions(parsedQuestions), callId);
  };

  return {
    ask,
    cleanupExpiredSessions: () => sessionManager.cleanupExpiredSessions(),
    ensureInitialized,
  };
};
