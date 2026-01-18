import type { Question } from "../session/types.js";

import { SessionManager } from "../session/index.js";
import { getSessionDirectory } from "../session/utils.js";
import {
  AskUserQuestionsParametersSchema,
  QuestionSchema,
  QuestionsSchema,
  type QuestionInput,
} from "../shared/schemas.js";

// Re-export schemas for backward compatibility
export { QuestionSchema, QuestionsSchema, AskUserQuestionsParametersSchema };

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
    return sessionManager.startSession(
      normalizeQuestions(parsedQuestions),
      callId,
    );
  };

  return {
    ask,
    cleanupExpiredSessions: () => sessionManager.cleanupExpiredSessions(),
    ensureInitialized,
  };
};
