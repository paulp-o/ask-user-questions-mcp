import type { Question } from "../session/types.js";

import { SessionManager } from "../session/index.js";
import { ResponseFormatter } from "../session/ResponseFormatter.js";
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
    workingDirectory?: string,
    signal?: AbortSignal,
  ) => Promise<{ formattedResponse: string; sessionId: string }>;
  askNonBlocking: (
    questions: QuestionInput[],
    callId?: string,
    workingDirectory?: string,
  ) => Promise<{ sessionId: string; questionCount: number }>;
  getAnsweredQuestions: (
    sessionId: string,
    blocking?: boolean,
    signal?: AbortSignal,
  ) => Promise<{ formattedResponse: string; sessionId: string; status: string }>;
  cleanupExpiredSessions: () => Promise<number>;
  ensureInitialized: () => Promise<void>;
  markAbandoned: (sessionId: string) => Promise<void>;
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

  const ask = async (
    questions: QuestionInput[],
    callId?: string,
    workingDirectory?: string,
    signal?: AbortSignal,
  ) => {
    await ensureInitialized();
    const parsedQuestions = QuestionsSchema.parse(questions);
    return sessionManager.startSession(
      normalizeQuestions(parsedQuestions),
      callId,
      workingDirectory,
      signal,
    );
  };

  const askNonBlocking = async (
    questions: QuestionInput[],
    callId?: string,
    workingDirectory?: string,
  ): Promise<{ sessionId: string; questionCount: number }> => {
    await ensureInitialized();
    const parsedQuestions = QuestionsSchema.parse(questions);
    const sessionId = await sessionManager.createSession(
      normalizeQuestions(parsedQuestions),
      workingDirectory,
    );
    return { sessionId, questionCount: parsedQuestions.length };
  };

  const getAnsweredQuestions = async (
    sessionId: string,
    blocking?: boolean,
    signal?: AbortSignal,
  ): Promise<{ formattedResponse: string; sessionId: string; status: string }> => {
    await ensureInitialized();

    // Resolve short ID to full UUID if needed
    let resolvedSessionId = sessionId;
    if (sessionId.length < 36) {
      const allIds = await sessionManager.getAllSessionIds();
      const match = allIds.find((id) => id.startsWith(sessionId));
      if (!match) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      resolvedSessionId = match;
    }

    const sessionStatus = await sessionManager.getSessionStatus(resolvedSessionId);
    if (!sessionStatus) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const shortId = resolvedSessionId.slice(0, 8);

    const handleCompleted = async () => {
      const answers = await sessionManager.getSessionAnswers(resolvedSessionId);
      const request = await sessionManager.getSessionRequest(resolvedSessionId);
      if (!answers || !request) {
        throw new Error(`Session data incomplete: ${resolvedSessionId}`);
      }
      const formatted = ResponseFormatter.formatUserResponse(answers, request.questions);
      const count = request.questions.length;
      const header = `[Session: ${shortId} | Questions: ${count}]`;
      const formattedResponse = `${header}\n\n${formatted}`;
      await sessionManager.markSessionAsRead(resolvedSessionId);
      return { formattedResponse, sessionId: resolvedSessionId, status: "completed" };
    };

    switch (sessionStatus.status) {
      case "completed": {
        return handleCompleted();
      }
      case "pending":
      case "in-progress": {
        if (blocking) {
          await sessionManager.waitForAnswers(resolvedSessionId, 0, undefined, signal);
          return handleCompleted();
        }
        const pendingResponse = `[Session: ${shortId} | Status: pending]\n\nNo answers yet.`;
        return { formattedResponse: pendingResponse, sessionId: resolvedSessionId, status: "pending" };
      }
      case "rejected": {
        const reason = sessionStatus.rejectionReason;
        const rejectedResponse = `[Session: ${shortId} | Status: rejected]\n\nUser rejected this question set.${reason ? ` Reason: "${reason}"` : ""}`;
        return { formattedResponse: rejectedResponse, sessionId: resolvedSessionId, status: "rejected" };
      }
      default: {
        const defaultResponse = `[Session: ${shortId} | Status: ${sessionStatus.status}]\n\nSession is no longer active.`;
        return { formattedResponse: defaultResponse, sessionId: resolvedSessionId, status: sessionStatus.status };
      }
    }
  };

  return {
    ask,
    askNonBlocking,
    getAnsweredQuestions,
    cleanupExpiredSessions: () => sessionManager.cleanupExpiredSessions(),
    ensureInitialized,
    markAbandoned: (sessionId: string) =>
      sessionManager.updateSessionStatus(sessionId, "abandoned"),
  };
};
